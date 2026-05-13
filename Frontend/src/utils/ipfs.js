import axios from 'axios';

// Sensitive keys are now loaded from Environment Variables for security
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

export const uploadToIPFS = async (certificateData) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    
    try {
        const response = await axios.post(url, {
            pinataContent: certificateData,
            pinataMetadata: {
                name: `Certificate-${certificateData.id}.json`,
            },
        }, {
            headers: {
                'Authorization': `Bearer ${PINATA_JWT}`,
                'Content-Type': 'application/json'
            },
        });
        return response.data.IpfsHash; 
    } catch (error) {
        console.error("IPFS Upload Error Details:", error.response ? error.response.data : error.message);
        throw error;
    }
};

export const getIPFSGatewayURL = (cid) => `https://gateway.pinata.cloud/ipfs/${cid}`;
