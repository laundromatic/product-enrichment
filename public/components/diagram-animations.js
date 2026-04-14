// ShopGraph Diagram Animations — IntersectionObserver trigger
// Include this script on any page with .dg-diagram containers.
// Animates all .dg-hidden, .dg-box, .dg-label, .dg-fill, .dg-connector
// elements within the diagram when it scrolls into view.
//
// Two animation phases:
// 1. ENTRANCE: Elements fade in sequentially (one-shot, staggered)
// 2. CONTINUOUS: Elements pulse/glow in sequence (infinite, staggered delays)
//
// Sequencing: Elements animate in DOM order within each diagram.
// The delay between each element creates a visual flow through the diagram.

(function() {
  var diagrams = document.querySelectorAll('.dg-diagram');
  if (!diagrams.length) return;

  // Configuration
  var ELEMENT_STAGGER_MS = 300;   // Delay between sequential elements
  var ENTRANCE_BASE_MS = 400;     // Base entrance animation duration

  // Collect all animatable elements within a diagram in DOM order.
  // This includes both dg-* utility class elements and dg-hidden SVG groups.
  function getAnimatableElements(diagram) {
    return diagram.querySelectorAll(
      '.dg-box, .dg-label, .dg-fill, .dg-connector, .dg-hidden'
    );
  }

  // Get elements that receive continuous pulse animation
  function getContinuousElements(diagram) {
    return diagram.querySelectorAll(
      '.dg-box, .dg-label, .dg-fill, .dg-connector'
    );
  }

  // Calculate the total cycle duration for a diagram based on element count.
  // Each element gets a staggered delay within the cycle. The animation
  // duration on each element is fixed (from CSS), but the delay shifts
  // so they fire in sequence.
  function applyContinuousDelays(diagram) {
    var elements = getContinuousElements(diagram);
    if (!elements.length) return;

    elements.forEach(function(el, index) {
      // Only override delay if the element doesn't have a manual one
      // via data-dg-delay (which is used for entrance stagger).
      // For continuous animation, use animation-delay CSS property.
      var stagger = index * ELEMENT_STAGGER_MS;
      el.style.animationDelay = stagger + 'ms';
    });
  }

  // Activate a diagram: run entrance animations, then start continuous cycle
  function activateDiagram(diagram) {
    if (diagram.dataset.dgActive === 'true') return;
    diagram.dataset.dgActive = 'true';

    var allElements = getAnimatableElements(diagram);
    var entranceIndex = 0;

    allElements.forEach(function(el) {
      // Determine entrance delay: use data-dg-delay if set, otherwise auto-sequence
      var manualDelay = el.getAttribute('data-dg-delay');
      var delay;
      if (manualDelay !== null) {
        delay = parseInt(manualDelay, 10);
      } else {
        delay = entranceIndex * ELEMENT_STAGGER_MS;
      }
      entranceIndex++;

      setTimeout(function() {
        // Entrance: fade in hidden elements
        if (el.classList.contains('dg-hidden')) {
          el.classList.remove('dg-hidden');
          el.classList.add('dg-visible');
        }

        // Continuous: start pulse/glow animation
        if (el.classList.contains('dg-box') ||
            el.classList.contains('dg-label') ||
            el.classList.contains('dg-fill') ||
            el.classList.contains('dg-connector')) {
          el.classList.add('dg-animate');
        }
      }, delay);
    });

    // Apply staggered animation-delay for continuous cycling
    applyContinuousDelays(diagram);
  }

  // Deactivate a diagram: stop continuous animations, reset to hidden
  function deactivateDiagram(diagram) {
    if (diagram.dataset.dgActive !== 'true') return;
    diagram.dataset.dgActive = 'false';

    var allElements = getAnimatableElements(diagram);
    allElements.forEach(function(el) {
      // Remove continuous animation
      el.classList.remove('dg-animate');
      el.style.animationDelay = '';

      // Reset entrance animation — put elements back to hidden
      if (el.classList.contains('dg-visible')) {
        el.classList.remove('dg-visible');
        el.classList.add('dg-hidden');
      }
    });
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        activateDiagram(entry.target);
      } else {
        deactivateDiagram(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  diagrams.forEach(function(d) { observer.observe(d); });
})();
