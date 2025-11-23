console.log('[NewsletterPopup] JavaScript file loaded');

// Test if basic JavaScript is working
console.log('[NewsletterPopup] Basic JavaScript test - Date:', new Date());

// Test if required dependencies exist
console.log('[NewsletterPopup] customElements available:', typeof customElements !== 'undefined');
console.log('[NewsletterPopup] ModalElement available:', typeof ModalElement !== 'undefined');
console.log('[NewsletterPopup] theme available:', typeof theme !== 'undefined');

if (!customElements.get('newsletter-modal')) {
  console.log('[NewsletterPopup] Defining newsletter-modal custom element');
  customElements.define(
    'newsletter-modal',
    class NewsletterModal extends ModalElement {
      constructor() {
        super();
        console.log('[NewsletterPopup] NewsletterModal constructor called');
    
        // Prevent popup on Shopify robot challenge page
        if (window.location.pathname === '/challenge' || !theme.cookiesEnabled) {
          console.log('[NewsletterPopup] Skipping popup - challenge page or cookies disabled');
          return;
        }
    
        if (!theme.config.isTouch || Shopify.designMode) {
          console.log('[NewsletterPopup] Calling init immediately');
          this.init();
        }
        else {
          console.log('[NewsletterPopup] Using initWhenVisible for touch devices');
          new theme.initWhenVisible(theme.utils.throttle(this.init.bind(this)));
        }
      }
    
      get shouldLock() {
        return true;
      }
    
      get testMode() {
        return this.getAttribute('data-test-mode') === 'true';
      }
    
      get delay() {
        return this.hasAttribute('data-delay') ? parseInt(this.getAttribute('data-delay')) : 5;
      }
    
      get expiry() {
        return this.hasAttribute('data-expiry') ? parseInt(this.getAttribute('data-expiry')) : 30;
      }
    
      get cookieName() {
        return 'concept:newsletter-popup';
      }
    
      get submited() {
        const alertElement = this.querySelector('.alert');
        console.log('[NewsletterModal] submited check - alertElement found:', !!alertElement);
        if (alertElement) {
          console.log('[NewsletterModal] alertElement classes:', alertElement.className);
          console.log('[NewsletterModal] alertElement has hidden class:', alertElement.classList.contains('hidden'));
          console.log('[NewsletterModal] alertElement display style:', window.getComputedStyle(alertElement).display);
          
          // Check the parent container (newsletter-step)
          const parentContainer = alertElement.closest('.newsletter-step');
          if (parentContainer) {
            console.log('[NewsletterModal] parent container classes:', parentContainer.className);
            console.log('[NewsletterModal] parent container has hidden class:', parentContainer.classList.contains('hidden'));
            console.log('[NewsletterModal] parent container display style:', window.getComputedStyle(parentContainer).display);
            
            // Check if the parent container is visible (this is more reliable)
            const parentDisplayStyle = window.getComputedStyle(parentContainer).display;
            const parentIsVisible = parentDisplayStyle !== 'none';
            console.log('[NewsletterModal] parent container is visible:', parentIsVisible);
            
            return parentIsVisible;
          }
          
          // Fallback: check if the alert element is actually visible
          const displayStyle = window.getComputedStyle(alertElement).display;
          const isVisible = displayStyle !== 'none';
          console.log('[NewsletterModal] alertElement is visible:', isVisible);
          
          return isVisible;
        }
        return false;
      }
    
      init() {
        if (this.initialized) return;
        this.initialized = true;
        
        console.log('[NewsletterModal] init called. Delay:', this.delay, 'Test mode:', this.testMode, 'Cookie exists:', !!this.getCookie(this.cookieName));
        
        // Open modal if errors or success message exist
        if (this.submited) {
          console.log('[NewsletterModal] Modal already submitted, not showing');
          return;
        }
    
        if (this.testMode || !this.getCookie(this.cookieName)) {
          console.log('[NewsletterModal] Calling load with delay:', this.delay);
          this.load(this.delay);
        } else {
          console.log('[NewsletterModal] Cookie exists and not in test mode, not showing popup');
        }
      }
    
      load(delay) {
        if (Shopify.designMode) {
          console.log('[NewsletterModal] In Shopify design mode, not showing popup');
          return;
        }
    
        console.log('[NewsletterModal] load called. Will show in', delay, 'seconds');
        setTimeout(() => {
          console.log('[NewsletterModal] Showing modal now');
          this.show();
        }, delay * 1000);
      }
    
      afterShow() {
        super.afterShow();
        this.classList.add('show-image');
      }
    
      afterHide() {
        super.afterHide();
        this.classList.remove('show-image');
    
        // Remove a cookie in case it was set in test mode
        if (this.testMode) {
          this.removeCookie(this.cookieName);
          return;
        }
    
        this.setCookie(this.cookieName, this.expiry);
      }
    
      getCookie(name) {
        const match = document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`);
        return match ? match[2] : null;
      }
    
      setCookie(name, expiry) {
        document.cookie = `${name}=true; max-age=${(expiry * 24 * 60 * 60)}; path=/`;
      }
    
      removeCookie(name) {
        document.cookie = `${name}=; max-age=0`;
      }
    
      setCookieNow() {
        if (!this.testMode) {
          console.log('[NewsletterModal] Setting cookie immediately');
          this.setCookie(this.cookieName, this.expiry);
        }
      }
    }
  );
}

