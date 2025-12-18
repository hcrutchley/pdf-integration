/**
 * FILE STORAGE SERVICE - now calls your own upload endpoint.
 */

export const fileStorage = {
  /**
   * Upload a file and return its URL
   * @param {File} file - The file to upload
   * @returns {Promise<string>} The URL of the uploaded file
   */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Upload failed");
    }

    const data = await res.json();
    return data.file_url;
  },

  /**
   * Convert a file URL to a data URL for display
   */
  async getDataUrl(url) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error fetching file:", error);
      throw error;
    }
  },
};
