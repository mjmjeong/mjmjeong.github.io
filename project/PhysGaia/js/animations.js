// Create particle animations for the home page
document.addEventListener('DOMContentLoaded', function() {
  // Initialize scroll-based animations for all pages
  initializeScrollAnimations();
  
  // Only run particle animations on the home page (not on element pages)
  const heroSection = document.querySelector('.hero-section');
  if (!heroSection || heroSection.classList.contains('water-hero') || 
      heroSection.classList.contains('fire-hero') || 
      heroSection.classList.contains('earth-hero') || 
      heroSection.classList.contains('wind-hero')) {
    return;
  }
  
  const createParticles = () => {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particle-container';
    document.querySelector('.hero-section').appendChild(particleContainer);
    
    // Create particles for each element
    const elements = ['water', 'fire', 'earth', 'wind'];
    const colors = {
      water: ['#64b5f6', '#1e88e5', '#0d47a1'],
      fire: ['#ff8a80', '#e53935', '#b71c1c'],
      earth: ['#81c784', '#43a047', '#1b5e20'],
      wind: ['#b0bec5', '#78909c', '#37474f']
    };
    
    elements.forEach(element => {
      for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = `particle ${element}-particle`;
        
        // Random position, size, and animation delay
        const size = Math.random() * 10 + 5;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.backgroundColor = colors[element][Math.floor(Math.random() * colors[element].length)];
        particle.style.animationDelay = `${Math.random() * 5}s`;
        particle.style.animationDuration = `${Math.random() * 10 + 10}s`;
        
        particleContainer.appendChild(particle);
      }
    });
  };
  
  createParticles();
});

// Initialize scroll-based animations
function initializeScrollAnimations() {
  const animateElements = document.querySelectorAll('.animate-in');
  
  // Immediately show elements that are already in view
  const checkInitialVisibility = () => {
    animateElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      
      if (isVisible) {
        // Add a small delay for sequential animation
        setTimeout(() => {
          element.style.opacity = '1';
          element.style.transform = 'translateY(0)';
        }, index * 100);
      }
    });
  };
  
  // Check visibility on scroll
  const handleScroll = () => {
    animateElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight * 0.8;
      
      if (isVisible && element.style.opacity !== '1') {
        setTimeout(() => {
          element.style.opacity = '1';
          element.style.transform = 'translateY(0)';
        }, index * 50);
      }
    });
  };
  
  // Check initial visibility
  checkInitialVisibility();
  
  // Add scroll listener with throttling
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(handleScroll, 10);
  });
}
