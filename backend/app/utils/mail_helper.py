import os
import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def _is_production():
    return os.environ.get('FLASK_ENV', 'development').lower() == 'production'


def _log_otp_fallback(email, code):
    """OTP fallback log'u. GÜVENLİK: Üretimde kodu ASLA log'a yazma."""
    if _is_production():
        print(f"[MAIL ERROR] SMTP yapılandırılmamış/başarısız — {email} için doğrulama kodu gönderilemedi. "
              f"(Kod güvenlik nedeniyle log'a yazılmadı.)")
    else:
        print(f"\n[MAIL FALLBACK - SMTP NOT CONFIGURED / DEV ONLY]")
        print(f"To: {email}")
        print(f"Verification Code: {code}")
        print(f"--------------------------------------\n")


def _send_email_task(email, code):
    """Internal SMTP task that executes in a background daemon thread."""
    # Read environment configurations with safe defaults
    mail_server = os.environ.get('MAIL_SERVER')
    mail_port = os.environ.get('MAIL_PORT')
    mail_username = os.environ.get('MAIL_USERNAME')
    mail_password = os.environ.get('MAIL_PASSWORD')
    mail_use_tls = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    mail_from_name = os.environ.get('MAIL_FROM_NAME', 'Keepr')
    mail_from_email = os.environ.get('MAIL_FROM_EMAIL', mail_username or 'no-reply@keepr.app')
    
    # Validation check: if no SMTP configured, fall back (kod üretimde loglanmaz)
    if not mail_server or not mail_port or not mail_username or not mail_password:
        _log_otp_fallback(email, code)
        return
        
    try:
        mail_port = int(mail_port)
    except ValueError:
        print(f"[MAIL ERROR] Invalid mail port: {mail_port}")
        return

    # Construct MIMEMultipart message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Keepr Doğrulama Kodu'
    msg['From'] = f"{mail_from_name} <{mail_from_email}>"
    msg['To'] = email
    
    # Premium Corporate HTML Template
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Keepr Doğrulama Kodu</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 0;
    }}
    .container {{
      max-width: 440px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      overflow: hidden;
    }}
    .header {{
      padding: 32px 32px 16px 32px;
      text-align: center;
    }}
    .logo-container {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
      border-radius: 14px;
      margin-bottom: 20px;
    }}
    .logo-icon {{
      color: #ffffff;
      font-size: 26px;
      font-weight: 900;
      line-height: 52px;
    }}
    .title {{
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
      letter-spacing: -0.025em;
    }}
    .subtitle {{
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
      margin: 0;
    }}
    .content {{
      padding: 0 32px 32px 32px;
      text-align: center;
    }}
    .divider {{
      height: 1px;
      background-color: #f1f5f9;
      margin: 24px 0;
    }}
    .code-box {{
      background-color: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      padding: 22px;
      margin: 24px 0;
      text-align: center;
    }}
    .code-text {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #065f46;
      margin: 0;
    }}
    .footer {{
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #f1f5f9;
    }}
    .footer-text {{
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <div class="logo-icon">K</div>
        </div>
        <h1 class="title">E-posta Adresini Doğrula</h1>
        <p class="subtitle">Keepr dijital kütüphane hesabınızı aktifleştirmek için aşağıdaki 6 haneli doğrulama kodunu kullanın.</p>
      </div>
      
      <div class="content">
        <div class="divider"></div>
        <div class="code-box">
          <div class="code-text">{code}</div>
        </div>
        <p class="subtitle" style="font-size: 13px; color: #94a3b8;">Bu tek kullanımlık güvenlik kodu 10 dakika boyunca geçerlidir. Talebi siz yapmadıysanız bu e-postayı güvenle göz ardı edebilirsiniz.</p>
      </div>
      
      <div class="footer">
        <p class="footer-text">© 2026 Keepr. Tüm hakları saklıdır.<br>Bu e-posta otomatik olarak oluşturulmuştur, lütfen doğrudan yanıtlamayınız.</p>
      </div>
    </div>
  </div>
</body>
</html>
"""
    # Plain text version fallback
    text_content = f"Keepr hesabınızı doğrulamak için tek kullanımlık kodunuz: {code}\nBu kod 10 dakika boyunca geçerlidir."
    
    msg.attach(MIMEText(text_content, 'plain'))
    msg.attach(MIMEText(html_content, 'html'))
    
    try:
        # Establish connection with socket timeout (10 seconds)
        server = smtplib.SMTP(mail_server, mail_port, timeout=10)
        
        if mail_use_tls:
            server.starttls()
            
        server.login(mail_username, mail_password)
        server.sendmail(mail_from_email, email, msg.as_string())
        server.quit()
        print(f"[MAIL SUCCESS] Verification code sent to {email}")
    except Exception as e:
        print(f"[MAIL ERROR] Failed to send SMTP email to {email}: {str(e)}")
        # Fallback (dev'de kodu göster, üretimde ASLA)
        _log_otp_fallback(email, code)

def send_verification_email_async(email, code):
    """Dispatches verification email in a background daemon thread to avoid blocking client API requests."""
    thread = threading.Thread(target=_send_email_task, args=(email, code))
    thread.daemon = True
    thread.start()


def _send_password_reset_task(email, code):
    """Şifre sıfırlama kodunu e-posta ile gönderir (arka plan thread'i)."""
    mail_server = os.environ.get('MAIL_SERVER')
    mail_port = os.environ.get('MAIL_PORT')
    mail_username = os.environ.get('MAIL_USERNAME')
    mail_password = os.environ.get('MAIL_PASSWORD')
    mail_use_tls = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    mail_from_name = os.environ.get('MAIL_FROM_NAME', 'Keepr')
    mail_from_email = os.environ.get('MAIL_FROM_EMAIL', mail_username or 'no-reply@keepr.app')

    if not mail_server or not mail_port or not mail_username or not mail_password:
        _log_otp_fallback(email, code)
        return
    try:
        mail_port = int(mail_port)
    except ValueError:
        print(f"[MAIL ERROR] Invalid mail port: {mail_port}")
        return

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Keepr Şifre Sıfırlama Kodu'
    msg['From'] = f"{mail_from_name} <{mail_from_email}>"
    msg['To'] = email
    text = (f"Keepr şifrenizi sıfırlamak için tek kullanımlık kodunuz: {code}\n"
            f"Bu kod 15 dakika boyunca geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayın.")
    html = f"""<div style="font-family:sans-serif"><p>Şifre sıfırlama kodunuz:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{code}</p>
    <p>Bu kod 15 dakika geçerlidir. Bu isteği siz yapmadıysanız yok sayın.</p></div>"""
    msg.attach(MIMEText(text, 'plain'))
    msg.attach(MIMEText(html, 'html'))

    try:
        server = smtplib.SMTP(mail_server, mail_port)
        if mail_use_tls:
            server.starttls()
        server.login(mail_username, mail_password)
        server.sendmail(mail_from_email, email, msg.as_string())
        server.quit()
        print(f"[MAIL SUCCESS] Password reset code sent to {email}")
    except Exception as e:
        print(f"[MAIL ERROR] Failed to send reset email to {email}: {str(e)}")
        _log_otp_fallback(email, code)


def send_password_reset_email_async(email, code):
    """Şifre sıfırlama kodunu arka plan thread'inde gönderir."""
    thread = threading.Thread(target=_send_password_reset_task, args=(email, code))
    thread.daemon = True
    thread.start()

def _send_reminder_email_task(email, keep_title, keep_url):
    """Internal SMTP task that executes in a background daemon thread to send reminders."""
    mail_server = os.environ.get('MAIL_SERVER')
    mail_port = os.environ.get('MAIL_PORT')
    mail_username = os.environ.get('MAIL_USERNAME')
    mail_password = os.environ.get('MAIL_PASSWORD')
    mail_use_tls = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    mail_from_name = os.environ.get('MAIL_FROM_NAME', 'Keepr')
    mail_from_email = os.environ.get('MAIL_FROM_EMAIL', mail_username or 'no-reply@keepr.app')
    
    if not mail_server or not mail_port or not mail_username or not mail_password:
        print(f"\n[MAIL FALLBACK - SMTP NOT CONFIGURED]")
        print(f"To: {email}")
        print(f"Subject: Okuma Zamanı! 🔔")
        print(f"Keep Title: {keep_title}")
        print(f"Keep URL: {keep_url}")
        print(f"--------------------------------------\n")
        return
        
    try:
        mail_port = int(mail_port)
    except ValueError:
        print(f"[MAIL ERROR] Invalid mail port: {mail_port}")
        return

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"Okuma Hatırlatıcısı: {keep_title}"
    msg['From'] = f"{mail_from_name} <{mail_from_email}>"
    msg['To'] = email
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Okuma Hatırlatıcısı</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 0;
    }}
    .container {{
      max-width: 440px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      overflow: hidden;
    }}
    .header {{
      padding: 32px 32px 16px 32px;
      text-align: center;
    }}
    .logo-container {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
      border-radius: 14px;
      margin-bottom: 20px;
    }}
    .logo-icon {{
      color: #ffffff;
      font-size: 26px;
      font-weight: 900;
      line-height: 52px;
    }}
    .title {{
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
      letter-spacing: -0.025em;
    }}
    .subtitle {{
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
      margin: 0;
    }}
    .content {{
      padding: 0 32px 32px 32px;
      text-align: center;
    }}
    .divider {{
      height: 1px;
      background-color: #f1f5f9;
      margin: 24px 0;
    }}
    .keep-box {{
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      text-align: left;
    }}
    .keep-title {{
      font-size: 16px;
      font-weight: 700;
      color: #166534;
      margin-bottom: 8px;
    }}
    .keep-link {{
      font-size: 12px;
      color: #15803d;
      word-break: break-all;
    }}
    .btn {{
      display: inline-block;
      padding: 12px 24px;
      background-color: #10b981;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      border-radius: 10px;
      margin-top: 16px;
    }}
    .footer {{
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #f1f5f9;
    }}
    .footer-text {{
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <div class="logo-icon">K</div>
        </div>
        <h1 class="title">Okuma Zamanı! 🔔</h1>
        <p class="subtitle">Kaydetmiş olduğunuz bir bağlantı için hatırlatma zamanı geldi.</p>
      </div>
      
      <div class="content">
        <div class="divider"></div>
        <div class="keep-box">
          <div class="keep-title">{keep_title}</div>
          <div class="keep-link">{keep_url}</div>
        </div>
        <a href="{keep_url}" class="btn" target="_blank">Bağlantıyı Aç</a>
      </div>
      
      <div class="footer">
        <p class="footer-text">© 2026 Keepr. Tüm hakları saklıdır.<br>Bu hatırlatıcı talebiniz üzerine gönderilmiştir.</p>
      </div>
    </div>
  </div>
</body>
</html>
"""
    text_content = f"Okuma Hatırlatıcısı: {keep_title}\nBağlantıyı okuma zamanınız geldi. Bağlantı adresi: {keep_url}"
    msg.attach(MIMEText(text_content, 'plain'))
    msg.attach(MIMEText(html_content, 'html'))
    
    try:
        server = smtplib.SMTP(mail_server, mail_port, timeout=10)
        if mail_use_tls:
            server.starttls()
        server.login(mail_username, mail_password)
        server.sendmail(mail_from_email, email, msg.as_string())
        server.quit()
        print(f"[MAIL SUCCESS] Reminder email sent to {email}")
    except Exception as e:
        print(f"[MAIL ERROR] Failed to send SMTP reminder email to {email}: {str(e)}")
        print(f"[MAIL FALLBACK - SMTP CRASHED] Reminder for {email}: {keep_title} ({keep_url})")

def send_reminder_email_async(email, keep_title, keep_url):
    """Dispatches reminder email in a background daemon thread."""
    thread = threading.Thread(target=_send_reminder_email_task, args=(email, keep_title, keep_url))
    thread.daemon = True
    thread.start()

def check_smtp_status():
    """Diagnoses connection to SMTP server to report backend health status."""
    mail_server = os.environ.get('MAIL_SERVER')
    mail_port = os.environ.get('MAIL_PORT')
    mail_username = os.environ.get('MAIL_USERNAME')
    mail_password = os.environ.get('MAIL_PASSWORD')
    
    if not mail_server or not mail_port or not mail_username or not mail_password:
        return {
            'status': 'configured_fallback',
            'details': 'SMTP credentials missing, using terminal fallback logs for development.'
        }
    
    try:
        port = int(mail_port)
        server = smtplib.SMTP(mail_server, port, timeout=3)
        server.ehlo()
        if os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true':
            server.starttls()
            server.ehlo()
        server.quit()
        return {'status': 'connected', 'details': 'Successfully connected to SMTP server.'}
    except Exception as e:
        return {'status': 'error', 'details': str(e)}
