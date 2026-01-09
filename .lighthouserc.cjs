module.exports = {
  ci: {
    collect: {
      // URL to test
      url: ['http://localhost:3000'],
      
      // Number of runs per URL
      numberOfRuns: 3,
      
      // Settings for the Chrome browser
      settings: {
        // Collect performance, accessibility, best practices, and SEO
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    
    assert: {
      // Optional: Add assertions/budgets
      // Uncomment and adjust thresholds as needed
      // assertions: {
      //   'categories:performance': ['warn', { minScore: 0.9 }],
      //   'categories:accessibility': ['error', { minScore: 0.9 }],
      //   'categories:best-practices': ['warn', { minScore: 0.9 }],
      //   'categories:seo': ['warn', { minScore: 0.9 }],
      // },
    },
    
    upload: {
      // Where to store results
      // Options: 'temporary-public-storage' | custom server
      target: 'temporary-public-storage',
    },
  },
};
