"""Tests for encrypt_bytes / decrypt_bytes — raw BYTEA-safe AES-256-GCM."""

import os

import pytest

from crypto import decrypt_bytes, derive_key, encrypt_bytes

_TEST_KEY = derive_key("test-encryption-key-for-unit-tests")


class TestEncryptBytes:
    def test_returns_bytes(self) -> None:
        ct = encrypt_bytes(b"hello world", _TEST_KEY)
        assert isinstance(ct, bytes)

    def test_ciphertext_differs_from_plaintext(self) -> None:
        plaintext = b"sensitive pdf content"
        ct = encrypt_bytes(plaintext, _TEST_KEY)
        assert ct != plaintext

    def test_different_nonces_produce_different_ciphertext(self) -> None:
        plaintext = b"same input"
        ct1 = encrypt_bytes(plaintext, _TEST_KEY)
        ct2 = encrypt_bytes(plaintext, _TEST_KEY)
        assert ct1 != ct2

    def test_empty_bytes_encrypts_successfully(self) -> None:
        ct = encrypt_bytes(b"", _TEST_KEY)
        assert isinstance(ct, bytes)
        assert len(ct) > 0


class TestDecryptBytes:
    def test_roundtrip(self) -> None:
        plaintext = os.urandom(1024)
        ct = encrypt_bytes(plaintext, _TEST_KEY)
        result = decrypt_bytes(ct, _TEST_KEY)
        assert result == plaintext

    def test_large_payload_roundtrip(self) -> None:
        plaintext = os.urandom(5 * 1024 * 1024)  # 5 MB
        ct = encrypt_bytes(plaintext, _TEST_KEY)
        result = decrypt_bytes(ct, _TEST_KEY)
        assert result == plaintext

    def test_wrong_key_raises(self) -> None:
        from cryptography.exceptions import InvalidTag

        other_key = derive_key("different-key")
        ct = encrypt_bytes(b"secret", _TEST_KEY)
        with pytest.raises(InvalidTag):
            decrypt_bytes(ct, other_key)

    def test_truncated_ciphertext_raises(self) -> None:
        with pytest.raises(ValueError, match="at least"):
            decrypt_bytes(b"too short", _TEST_KEY)

    def test_corrupted_ciphertext_raises(self) -> None:
        from cryptography.exceptions import InvalidTag

        ct = encrypt_bytes(b"data", _TEST_KEY)
        corrupted = ct[:12] + bytes([ct[12] ^ 0xFF]) + ct[13:]
        with pytest.raises(InvalidTag):
            decrypt_bytes(corrupted, _TEST_KEY)
