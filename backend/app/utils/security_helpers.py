import re

COMMON_PASSWORDS = {
    '12345678', 'password', 'qwerty123', 'ahmet123', 'abcdef', '123456', 
    '123456789', 'admin123', '1234567890', '111111', '123123', 'qwerty', 
    'admin', '12345', 'password123', 'welcome'
}

def validate_password_strength(password, username, email):
    # Rule 1: Min 12, Max 64
    if len(password) < 12:
        return 'Şifre en az 12 karakter uzunluğunda olmalıdır.'
    if len(password) > 64:
        return 'Şifre en fazla 64 karakter uzunluğunda olmalıdır.'
        
    # Rule 2: Upper, Lower, Digit, Special char
    if not re.search(r'[A-Z]', password):
        return 'Şifre en az bir büyük harf (A-Z) içermelidir.'
    if not re.search(r'[a-z]', password):
        return 'Şifre en az bir küçük harf (a-z) içermelidir.'
    if not re.search(r'\d', password):
        return 'Şifre en az bir rakam (0-9) içermelidir.'
    if not re.search(r'[@$!%*?&.#_-]', password):
        return 'Şifre en az bir özel karakter (@$!%*?&.#_-) içermelidir.'
        
    # Rule 3: Common passwords
    if password.lower() in COMMON_PASSWORDS:
        return 'Seçtiğiniz şifre çok yaygın/tahmin edilebilir bir şifredir.'
        
    # Rule 4: Username/Email inclusion
    clean_username = username.lower().strip() if username else ''
    clean_email_prefix = email.split('@')[0].lower().strip() if email and '@' in email else ''
    if clean_username and clean_username in password.lower():
        return 'Şifreniz kullanıcı adınızı içeremez.'
    if clean_email_prefix and clean_email_prefix in password.lower():
        return 'Şifreniz e-posta adresinizi içeremez.'
        
    # Rule 5: Repeating characters (e.g. AAAA, 1111, max 3 in a row)
    for i in range(len(password) - 3):
        if password[i] == password[i+1] == password[i+2] == password[i+3]:
            return 'Şifrenizde 3\'ten fazla ardışık tekrar eden karakter bulunamaz.'
            
    return None
