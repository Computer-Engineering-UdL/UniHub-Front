// ==UserScript==
// @name         UniRoom OAuth Auto-Closer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically extract OAuth tokens and close the popup window
// @author       UniRoom Team
// @match        https://api.unihub.smuks.dev/api/v1/auth/*/callback*
// @match        http://api.unihub.smuks.dev/api/v1/auth/*/callback*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('[UniRoom OAuth] UserScript loaded');

  function extractAndSendTokens() {
    try {
      // Get page content
      let bodyText = document.body.textContent || document.body.innerText || '';

      // Check for <pre> tag (common for JSON display)
      const preElement = document.querySelector('pre');
      if (preElement) {
        bodyText = preElement.textContent || preElement.innerText || '';
      }

      // Try to parse as JSON
      const trimmedText = bodyText.trim();
      if (!trimmedText.startsWith('{') || !trimmedText.includes('access_token')) {
        console.log('[UniRoom OAuth] No JSON tokens found on page');
        return false;
      }

      const tokenData = JSON.parse(trimmedText);

      if (!tokenData.access_token || !tokenData.refresh_token) {
        console.log('[UniRoom OAuth] Incomplete token data');
        return false;
      }

      console.log('[UniRoom OAuth] Tokens found!', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        tokenType: tokenData.token_type
      });

      // Check if we have an opener window
      if (!window.opener) {
        console.error('[UniRoom OAuth] No opener window found');
        showMessage('❌ Error: No opener window found', 'error');
        return false;
      }

      // Determine provider from URL
      const provider = window.location.pathname.includes('google')
        ? 'google'
        : window.location.pathname.includes('github')
          ? 'github'
          : 'unknown';

      console.log('[UniRoom OAuth] Sending tokens to parent window...');

      // Send tokens to parent window
      window.opener.postMessage(
        {
          type: 'oauth-tokens',
          provider: provider,
          tokens: tokenData
        },
        '*'
      ); // Use '*' because we might not know the exact origin

      // Show success message
      showMessage('✅ Tokens enviats correctament!<br>Tancant finestra...', 'success');

      // Close window after a short delay
      setTimeout(() => {
        console.log('[UniRoom OAuth] Closing window');
        window.close();
      }, 1000);

      return true;
    } catch (error) {
      console.error('[UniRoom OAuth] Error:', error);
      showMessage('❌ Error: ' + error.message, 'error');
      return false;
    }
  }

  function showMessage(message, type = 'info') {
    const colors = {
      success: { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: 'white' },
      error: { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', text: 'white' },
      info: { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', text: 'white' }
    };

    const style = colors[type] || colors.info;

    document.body.innerHTML = `
            <div style="
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: ${style.bg};
                color: ${style.text};
                text-align: center;
            ">
                <div>
                    <div style="font-size: 64px; margin-bottom: 1rem; animation: pulse 1s infinite;">
                        ${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}
                    </div>
                    <h2 style="margin: 0 0 1rem 0;">${message}</h2>
                </div>
            </div>
            <style>
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            </style>
        `;
  }

  // Wait for page to load completely
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', extractAndSendTokens);
  } else {
    // DOM already loaded
    setTimeout(extractAndSendTokens, 100);
  }
})();
