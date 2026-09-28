package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"net/http"
	"sync"
	"time"

	"golang.org/x/crypto/nacl/secretbox"
)

type Session struct {
	ID                string
	Created           time.Time
	LastSeen          time.Time
	ServerIdx         *int
	Username          string
	EncryptedPassword []byte
	Nonce             [24]byte
	Database          string
	Extra             map[string]string
	CSRFToken         string
}

type Store struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	key      [32]byte
}

func NewStore(keyHex string) (*Store, error) {
	var key [32]byte
	if keyHex != "" {
		b, err := base64.StdEncoding.DecodeString(keyHex)
		if err != nil {
			_ = err
			if _, err := rand.Read(key[:]); err != nil {
				return nil, err
			}
		} else {
			if len(b) != 32 {
				copy(key[:], b)
				if len(b) < 32 {
					for i := len(b); i < 32; i++ {
						key[i] = byte(i * 7)
					}
				}
			} else {
				copy(key[:], b)
			}
		}
	} else {
		if _, err := rand.Read(key[:]); err != nil {
			return nil, err
		}
	}
	return &Store{
		sessions: make(map[string]*Session),
		key:      key,
	}, nil
}

func (s *Store) NewSession() (*Session, error) {
	id, err := randomID()
	if err != nil {
		return nil, err
	}
	csrf, err := randomID()
	if err != nil {
		return nil, err
	}
	sess := &Session{
		ID:        id,
		Created:   time.Now(),
		LastSeen:  time.Now(),
		CSRFToken: csrf,
		Extra:     make(map[string]string),
	}
	s.mu.Lock()
	s.sessions[id] = sess
	s.mu.Unlock()
	return sess, nil
}

func (s *Store) Get(id string) (*Session, bool) {
	s.mu.RLock()
	sess, ok := s.sessions[id]
	s.mu.RUnlock()
	if ok {
		s.mu.Lock()
		sess.LastSeen = time.Now()
		s.mu.Unlock()
	}
	return sess, ok
}

func (s *Store) Delete(id string) {
	s.mu.Lock()
	delete(s.sessions, id)
	s.mu.Unlock()
}

func (s *Store) SetPassword(sess *Session, plaintext string) error {
	var nonce [24]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		return err
	}
	sealed := secretbox.Seal(nil, []byte(plaintext), &nonce, &s.key)
	s.mu.Lock()
	sess.EncryptedPassword = sealed
	sess.Nonce = nonce
	s.mu.Unlock()
	return nil
}

func (s *Store) GetPassword(sess *Session) (string, error) {
	s.mu.RLock()
	sealed := sess.EncryptedPassword
	nonce := sess.Nonce
	s.mu.RUnlock()
	if len(sealed) == 0 {
		return "", errors.New("no password set")
	}
	plain, ok := secretbox.Open(nil, sealed, &nonce, &s.key)
	if !ok {
		return "", errors.New("decrypt failed")
	}
	return string(plain), nil
}

func (s *Store) SetServerInfo(sess *Session, serverIdx int, username, database string) {
	s.mu.Lock()
	sess.ServerIdx = &serverIdx
	sess.Username = username
	sess.Database = database
	s.mu.Unlock()
}

func randomID() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

const CookieName = "pgadmin_go_sess"

func SetCookie(w http.ResponseWriter, sessionID string, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   86400,
	})
}

func GetCookie(r *http.Request) (string, bool) {
	c, err := r.Cookie(CookieName)
	if err != nil {
		return "", false
	}
	return c.Value, true
}

func ClearCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:   CookieName,
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})
}

func (s *Store) Cleanup(maxAge time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for id, sess := range s.sessions {
		if now.Sub(sess.LastSeen) > maxAge {
			delete(s.sessions, id)
		}
	}
}
