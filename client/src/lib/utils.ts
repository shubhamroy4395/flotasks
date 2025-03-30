import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ShareOptions {
  title?: string;
  text: string;
  url?: string;
}

export async function shareContent({ title, text, url }: ShareOptions): Promise<boolean> {
  // Prepare share content with proper formatting 
  const formattedText = `✨ Gratitude Note ✨\n\n"${text}"\n\n#gratitude #positivity #flotasks`;
  
  // Check if the Web Share API is available
  if (navigator.share) {
    try {
      await navigator.share({
        title: title || 'Gratitude Note',
        text: formattedText,
        url: url || window.location.href
      });
      return true;
    } catch (error) {
      console.error('Error sharing content:', error);
      return false;
    }
  }
  
  // Fallback for desktop browsers without Web Share API
  else {
    try {
      const emailSubject = encodeURIComponent(title || 'Gratitude Note');
      const emailBody = encodeURIComponent(formattedText);
      const mailtoLink = `mailto:?subject=${emailSubject}&body=${emailBody}`;
      
      // WhatsApp sharing
      const whatsappText = encodeURIComponent(formattedText);
      const whatsappLink = `https://wa.me/?text=${whatsappText}`;
      
      // Instagram sharing (via clipboard)
      const instagramText = formattedText;
      
      // Create a small popup with sharing options and a beautiful preview
      const left = window.innerWidth / 2 - 300;
      const top = window.innerHeight / 2 - 200;
      
      const popup = window.open(
        '',
        'Share',
        `width=600,height=500,left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
      );
      
      if (popup) {
        popup.document.write(`
          <html>
            <head>
              <title>Share Gratitude</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  padding: 20px;
                  background: #f8f9fa;
                  color: #333;
                  margin: 0;
                }
                h2 {
                  margin-bottom: 10px;
                  color: #3a5795;
                }
                .share-options {
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                  margin-top: 20px;
                }
                .share-button {
                  display: flex;
                  align-items: center;
                  padding: 12px 16px;
                  border-radius: 8px;
                  border: none;
                  font-weight: 500;
                  cursor: pointer;
                  text-decoration: none;
                  color: white;
                  transition: all 0.2s;
                }
                .share-button:hover {
                  opacity: 0.9;
                  transform: translateY(-1px);
                }
                .email {
                  background: #ea4335;
                }
                .whatsapp {
                  background: #25D366;
                }
                .instagram {
                  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
                }
                .clipboard {
                  background: #6c757d;
                }
                .content-card {
                  background: linear-gradient(135deg, #6e8efb, #a777e3);
                  border-radius: 12px;
                  padding: 25px;
                  margin: 15px 0;
                  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                  position: relative;
                  overflow: hidden;
                }
                .content-card::before {
                  content: '"';
                  position: absolute;
                  top: -15px;
                  left: 10px;
                  font-size: 80px;
                  opacity: 0.2;
                  color: white;
                  font-family: Georgia, serif;
                }
                .content-card p {
                  color: white;
                  font-size: 18px;
                  line-height: 1.5;
                  position: relative;
                  z-index: 1;
                  font-weight: 500;
                }
                .content-card .hashtags {
                  margin-top: 15px;
                  color: rgba(255, 255, 255, 0.8);
                  font-size: 14px;
                }
                .success-message {
                  background: #d4edda;
                  color: #155724;
                  padding: 10px;
                  border-radius: 5px;
                  margin-top: 10px;
                  display: none;
                }
              </style>
            </head>
            <body>
              <h2>Share Gratitude</h2>
              <div class="content-card">
                <p>${text}</p>
                <div class="hashtags">#gratitude #positivity #flotasks</div>
              </div>
              <div class="share-options">
                <a href="${mailtoLink}" class="share-button email">Share via Email</a>
                <a href="${whatsappLink}" target="_blank" class="share-button whatsapp">Share via WhatsApp</a>
                <button class="share-button instagram" onclick="copyForInstagram()">Copy for Instagram</button>
                <button class="share-button clipboard" onclick="copyToClipboard()">Copy to Clipboard</button>
              </div>
              <div id="success-message" class="success-message"></div>
              <script>
                function showSuccess(message) {
                  const successEl = document.getElementById('success-message');
                  successEl.textContent = message;
                  successEl.style.display = 'block';
                  setTimeout(() => {
                    successEl.style.display = 'none';
                  }, 3000);
                }
                
                function copyForInstagram() {
                  navigator.clipboard.writeText(\`✨ Gratitude Note ✨\n\n"${text}"\n\n#gratitude #positivity #flotasks\`)
                    .then(() => {
                      showSuccess('Copied for Instagram! Now open Instagram and paste in your story or post.');
                    })
                    .catch(err => {
                      console.error('Error copying text: ', err);
                    });
                }
                
                function copyToClipboard() {
                  navigator.clipboard.writeText(\`${formattedText}\`)
                    .then(() => {
                      showSuccess('Copied to clipboard!');
                    })
                    .catch(err => {
                      console.error('Error copying text: ', err);
                    });
                }
              </script>
            </body>
          </html>
        `);
      }
      return true;
    } catch (error) {
      console.error('Error with fallback sharing:', error);
      return false;
    }
  }
}
