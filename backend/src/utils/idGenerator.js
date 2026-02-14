/**
 * Utility function to safely generate next ID for models
 * @param {Object} Model - Mongoose model
 * @returns {Promise<number>} - Next available ID
 */
export const getNextId = async (Model) => {
  try {
    const lastRecord = await Model.findOne().sort({ id: -1 }).select("id");
    
    if (lastRecord && typeof lastRecord.id === 'number' && !isNaN(lastRecord.id)) {
      return lastRecord.id + 1;
    }
    
    return 1;
  } catch (error) {
    console.error('Error generating next ID:', error);
    return 1;
  }
};

/**
 * Generate next ID with retry mechanism
 * @param {Object} Model - Mongoose model
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<number>} - Next available ID
 */
export const getNextIdWithRetry = async (Model, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const nextId = await getNextId(Model);
      
      // Verify the ID is not already taken
      const existingRecord = await Model.findOne({ id: nextId });
      if (!existingRecord) {
        return nextId;
      }
      
      // If ID is taken, try again
      console.warn(`ID ${nextId} already exists, retrying... (attempt ${attempt})`);
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  
  throw new Error('Failed to generate unique ID after maximum retries');
};