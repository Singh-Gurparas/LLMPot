import hashlib

def fingerprint_payload(method: str, path: str, body: str) -> str:
    """
    Generate a SHA256 hash representing a specific attack payload pattern.
    """
    components = []
    
    if method:
        components.append(method.upper())
    
    if path:
        # Normalize simple paths, though complex attacks often have specific paths
        components.append(path)
        
    if body:
        # Optional: Normalize body, e.g., strip whitespaces
        components.append(body.strip())
        
    raw_fingerprint = "|".join(components).encode('utf-8')
    return hashlib.sha256(raw_fingerprint).hexdigest()
