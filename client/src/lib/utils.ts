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
  // Check if the Web Share API is available
  if (navigator.share) {
    try {
      await navigator.share({
        title: title || 'Gratitude Note',
        text,
        url: url || window.location.href
      });
      return true;
    } catch (error) {
      console.error('Error sharing content:', error);
      return false;
    }
  }
  
  // Fallback for desktop browsers without Web Share API
  // Create a mailto link with the content
  else {
    try {
      const emailSubject = encodeURIComponent(title || 'Gratitude Note');
      const emailBody = encodeURIComponent(text);
      const mailtoLink = `mailto:?subject=${emailSubject}&body=${emailBody}`;
      
      // WhatsApp sharing
      const whatsappText = encodeURIComponent(text);
      const whatsappLink = `https://wa.me/?text=${whatsappText}`;
      
      // Create a small popup with sharing options
      const left = window.innerWidth / 2 - 300;
      const top = window.innerHeight / 2 - 200;
      
      const popup = window.open(
        '',
        'Share',
        `width=600,height=400,left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
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
                }
                h2 {
                  margin-bottom: 20px;
                }
                .share-options {
                  display: flex;
                  flex-direction: column;
                  gap: 15px;
                }
                .share-button {
                  display: flex;
                  align-items: center;
                  padding: 12px 20px;
                  border-radius: 8px;
                  border: none;
                  font-weight: 500;
                  cursor: pointer;
                  text-decoration: none;
                  color: white;
                  transition: opacity 0.2s;
                }
                .share-button:hover {
                  opacity: 0.9;
                }
                .email {
                  background: #ea4335;
                }
                .whatsapp {
                  background: #25D366;
                }
                .clipboard {
                  background: #6c757d;
                }
                .content-preview {
                  background: white;
                  padding: 15px;
                  border-radius: 8px;
                  margin-top: 20px;
                  border: 1px solid #ddd;
                }
              </style>
            </head>
            <body>
              <h2>Share Gratitude</h2>
              <div class="content-preview">
                <p>${text}</p>
              </div>
              <div class="share-options">
                <a href="${mailtoLink}" class="share-button email">Share via Email</a>
                <a href="${whatsappLink}" target="_blank" class="share-button whatsapp">Share via WhatsApp</a>
                <button class="share-button clipboard" onclick="copyToClipboard()">Copy to Clipboard</button>
              </div>
              <script>
                function copyToClipboard() {
                  navigator.clipboard.writeText(\`${text}\`)
                    .then(() => {
                      alert('Copied to clipboard!');
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
