// utils/validators.js

function validateEmail(email) {
  const re = /^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/;
  return re.test(String(email).toLowerCase());
}
  
function validateDateRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return startDate <= endDate;
}
  
function validateRole(role) {
  return ['admin', 'requestor', 'marketing_ops'].includes(role);
}
  
module.exports = {
  validateEmail,
  validateDateRange,
  validateRole
};