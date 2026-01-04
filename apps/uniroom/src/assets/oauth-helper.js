/**
 * OAuth Helper Script
 * This script should be injected into the OAuth callback page to extract tokens
 * and send them back to the parent window.
 *
 * For production use, the backend should redirect to our oauth-callback.html page.
 * This script is a fallback for development/testing.
 */

(function() {
  'use strict';

  console.log('[OAuth Helper] Script loaded');

  // Function to extract tokens from the page
  function extractTokens() {
    try {
      // Try to get JSON from page body
      let bodyText = document.body.textContent || document.body.innerText || '';

      // Check for <pre> tag (common for JSON display)
      const preElement = document.querySelector('pre');
      if (preElement) {
        bodyText = preElement.textContent || preElement.innerText || '';
      }

      // Try to parse as JSON
      const trimmedText = bodyText.trim();
      if (trimmedText.startsWith('{') && trimmedText.includes('access_token')) {
        const tokenData = JSON.parse(trimmedText);

        if (tokenData.access_token && tokenData.refresh_token) {
          return tokenData;
        }
      }

      // Try to extract from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      const tokenType = urlParams.get('token_type');

      if (accessToken && refreshToken) {
        return {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: tokenType || 'bearer'
        };
      }

      return null;
    } catch (error) {
      console.error('[OAuth Helper] Error extracting tokens:', error);
      return null;
    }
  }

  // Function to send tokens to parent window
  function sendTokensToParent(tokens) {
    if (!window.opener) {
      console.error('[OAuth Helper] No opener window found');
      return false;
    }

    try {
      // Determine provider from URL
      const provider = window.location.pathname.includes('google') ? 'google' :
                      window.location.pathname.includes('github') ? 'github' : 'unknown';

      console.log('[OAuth Helper] Sending tokens to parent window');

      window.opener.postMessage({
        type: 'oauth-tokens',
        provider: provider,
        tokens: tokens
      }, window.location.origin);

      return true;
    } catch (error) {
      console.error('[OAuth Helper] Error sending tokens:', error);
      return false;
    }
  }

  // Main execution
  function init() {
    console.log('[OAuth Helper] Initializing...');

    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Extract tokens
    const tokens = extractTokens();

    if (tokens) {
      console.log('[OAuth Helper] Tokens found!');

      // Send to parent
      if (sendTokensToParent(tokens)) {
        console.log('[OAuth Helper] Success! Closing window in 1 second...');

        // Show success message
        document.body.innerHTML = `
          <div style="
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
          ">
            <div>
              <div style="font-size: 48px; margin-bottom: 1rem;">✓</div>
              <h2>Authentication Successful!</h2>
              <p>Closing window...</p>
            </div>
          </div>
        `;

        // Close window after delay
        setTimeout(() => {
          window.close();
        }, 1000);
      }
    } else {
      console.log('[OAuth Helper] No tokens found on page');
    }
  }

  // Run immediately or on DOM ready
  init();
})();

