// --- AUTH UTILITIES (Temporary until backend is ready) ---

// Get all registered technicians from localStorage
function getRegisteredTechnicians() {
    const technicians = localStorage.getItem('registeredTechnicians');
    return technicians ? JSON.parse(technicians) : [];
}

// Save a new technician registration
function saveTechnicianRegistration(data) {
    const technicians = getRegisteredTechnicians();
    
    // Check if already registered
    const existingIndex = technicians.findIndex(t => t.phone === data.phone);
    
    if (existingIndex >= 0) {
        // Update existing
        technicians[existingIndex] = { ...technicians[existingIndex], ...data };
    } else {
        // Add new
        technicians.push(data);
    }
    
    localStorage.setItem('registeredTechnicians', JSON.stringify(technicians));
}

// Validate login credentials
function validateLoginCredentials(phone, password) {
    const technicians = getRegisteredTechnicians();
    
    // Normalize phone number (remove + or 234 prefix if present)
    const normalizedPhone = phone.replace(/^\+?234/, '0').replace(/^0/, '0');
    
    // Find technician with matching phone
    const technician = technicians.find(t => {
        const techPhone = t.phone.replace(/^\+?234/, '0').replace(/^0/, '0');
        return techPhone === normalizedPhone && t.password === password;
    });
    
    return technician || null;
}

// Check if phone is already registered
function isPhoneRegistered(phone) {
    const technicians = getRegisteredTechnicians();
    const normalizedPhone = phone.replace(/^\+?234/, '0').replace(/^0/, '0');
    
    return technicians.some(t => {
        const techPhone = t.phone.replace(/^\+?234/, '0').replace(/^0/, '0');
        return techPhone === normalizedPhone;
    });
}

// Validate Nigerian phone number
function isValidNigerianPhone(phone) {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Nigerian numbers:
    // - 11 digits starting with 0 (e.g., 08012345678)
    // - 13 digits starting with 234 (e.g., 2348012345678)
    if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
        return true;
    }
    if (cleanPhone.length === 13 && cleanPhone.startsWith('234')) {
        return true;
    }
    
    return false;
}

// Format phone to standard 11-digit format (080...)
function formatPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 13 && cleanPhone.startsWith('234')) {
        // Convert 2348012345678 to 08012345678
        return '0' + cleanPhone.substring(3);
    }
    
    return cleanPhone;
}