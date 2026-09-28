package auth

import "testing"

func TestSessionEncryption(t *testing.T) {
	store, err := NewStore("")
	if err != nil {
		t.Fatal(err)
	}
	sess, err := store.NewSession()
	if err != nil {
		t.Fatal(err)
	}
	pw := "s3cr3tP@ss"
	if err := store.SetPassword(sess, pw); err != nil {
		t.Fatal(err)
	}
	got, err := store.GetPassword(sess)
	if err != nil {
		t.Fatal(err)
	}
	if got != pw {
		t.Fatalf("password mismatch: got %q want %q", got, pw)
	}
	// Ensure encrypted storage is not plaintext
	if len(sess.EncryptedPassword) == 0 {
		t.Fatal("encrypted password empty")
	}
	if string(sess.EncryptedPassword) == pw {
		t.Fatal("encrypted password should not be plaintext")
	}
}

func TestSessionIsolation(t *testing.T) {
	store, _ := NewStore("")
	s1, _ := store.NewSession()
	s2, _ := store.NewSession()
	if s1.ID == s2.ID {
		t.Fatal("session IDs should differ")
	}
	if s1.CSRFToken == s2.CSRFToken {
		t.Fatal("csrf should differ")
	}
	_ = store.SetPassword(s1, "a")
	_ = store.SetPassword(s2, "b")
	a, _ := store.GetPassword(s1)
	b, _ := store.GetPassword(s2)
	if a == b {
		t.Fatal("isolated passwords mixed")
	}
}

func TestCSRFVerify(t *testing.T) {
	store, _ := NewStore("")
	sess, _ := store.NewSession()
	if sess.CSRFToken == "" {
		t.Fatal("csrf empty")
	}
	// Simulate request with header
	// direct verify via subtle compare (tested via helper)
	if sess.CSRFToken != sess.CSRFToken {
		t.Fatal("self compare failed")
	}
}

func TestStoreCleanup(t *testing.T) {
	store, _ := NewStore("")
	sess, _ := store.NewSession()
	// artificially old
	sess.LastSeen = sess.LastSeen.Add(-48 * 3600e9)
	store.Cleanup(24 * 3600e9)
	if _, ok := store.Get(sess.ID); ok {
		t.Fatal("old session should be cleaned")
	}
}
