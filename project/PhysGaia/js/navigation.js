// Enhanced navigation for fixed header
document.addEventListener('DOMContentLoaded', function() {
  // Get all navigation links that point to sections
  const navLinks = document.querySelectorAll('.sticky-nav .nav-link[href^="#"]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        // Calculate offset for fixed navigation
        const navHeight = document.querySelector('.sticky-nav').offsetHeight;
        const offset = 20; // Additional padding
        const totalOffset = navHeight + offset;
        
        // Get target position
        const targetPosition = targetElement.offsetTop - totalOffset;
        
        // Smooth scroll to target
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
});
