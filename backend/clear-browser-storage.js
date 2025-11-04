// JavaScript code to run in browser console to clear localStorage and sessionStorage
// Copy and paste this into your browser's console (F12 > Console tab)

(function() {
  const WIDGET_KEY = 'wtfu_464ed6cab852594fce9034020d77dee3';
  let deletedCount = 0;
  
  console.log('🧹 Clearing browser storage for widget:', WIDGET_KEY);
  
  // Clear localStorage
  console.log('\n📦 Clearing localStorage...');
  Object.keys(localStorage).forEach(key => {
    if (key.includes(WIDGET_KEY) || 
        key.includes('visitor_session_id') ||
        key.includes('wetechforu_widget') ||
        key.includes('wetechforu_visitor')) {
      const value = localStorage.getItem(key);
      localStorage.removeItem(key);
      deletedCount++;
      console.log(`  ✅ Deleted: ${key}`, value ? `(value: ${value.substring(0, 50)}...)` : '');
    }
  });
  
  // Clear sessionStorage
  console.log('\n📦 Clearing sessionStorage...');
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes(WIDGET_KEY) || 
        key.includes('wetechforu_welcome_shown') ||
        key.includes('wetechforu_widget')) {
      const value = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      deletedCount++;
      console.log(`  ✅ Deleted: ${key}`, value ? `(value: ${value.substring(0, 50)}...)` : '');
    }
  });
  
  console.log(`\n✅ Cleared ${deletedCount} storage keys!`);
  console.log('🔄 Refresh the page to start fresh.');
})();

