"""
AES-256-GCM authenticated encryption for PII at rest.
Key derived from Settings.encryption_key via HKDF-SHA256.
"""

import base64
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from constants import HKDF_INFO, HKDF_SALT

_NONCE_BYTES = 12
_KEY_LENGTH = 32


def derive_key(raw_key: str) -> bytes:
    """Derive a 32-byte AES key from the raw config string using HKDF-SHA256."""
    if not raw_key:
        raise ValueError("ENCRYPTION_KEY must not be blank — set it in .env")
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=_KEY_LENGTH,
        salt=HKDF_SALT,
        info=HKDF_INFO,
    )
    return hkdf.derive(raw_key.encode("utf-8"))


def encrypt(plaintext: str, key: bytes) -> str:
    """Encrypt plaintext with AES-256-GCM. Returns base64-encoded nonce+ciphertext."""
    nonce = os.urandom(_NONCE_BYTES)
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ct).decode("ascii")


_MIN_CIPHERTEXT_BYTES = _NONCE_BYTES + 16  # nonce + AES-GCM tag minimum


def decrypt(ciphertext_b64: str, key: bytes) -> str:
    """Decrypt a base64-encoded AES-256-GCM payload."""
    try:
        raw = base64.b64decode(ciphertext_b64)
    except Exception as exc:
        raise ValueError("Malformed ciphertext: invalid base64") from exc
    if len(raw) < _MIN_CIPHERTEXT_BYTES:
        raise ValueError(
            f"Malformed ciphertext: expected at least {_MIN_CIPHERTEXT_BYTES} bytes, got {len(raw)}"
        )
    nonce = raw[:_NONCE_BYTES]
    ct = raw[_NONCE_BYTES:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
