package auth

import (
	"net/http"
	"testing"
)

func TestVerifyCSRF(t *testing.T) {
	store, _ := NewStore("")
	sess, _ := store.NewSession()
	req, _ := http.NewRequest("POST", "/", nil)
	req.Header.Set(CSRFHeader, sess.CSRFToken)
	if !VerifyCSRF(req, sess) {
		t.Fatal("header token should verify")
	}
	req2, _ := http.NewRequest("POST", "/", nil)
	req2.Header.Set(CSRFHeader, "bad")
	if VerifyCSRF(req2, sess) {
		t.Fatal("bad token should not verify")
	}
	req3, _ := http.NewRequest("POST", "/?"+CSRFFormField+"="+sess.CSRFToken, nil)
	req3.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if !VerifyCSRF(req3, sess) {
		t.Fatal("form token should verify via query")
	}
}
