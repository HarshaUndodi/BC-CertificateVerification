import React, { useState } from 'react';
import { ethers } from 'ethers';
import getBlockchain from './ethereum';
import abi from './CertificateManager.json';

function RecipientDetails() {
  const [details, setDetails] = useState({ name: '', phoneNumber: '', certificates: [] });
  const contractAddress ="0xd9Cd2980969dCA1db4804c4cCC4033c9F7D38680";
  const ContractABI = abi.abi;


  const handleFetchDetails = async () => {
    const { signer } = await getBlockchain();
    const contract = new ethers.Contract(contractAddress, ContractABI, signer);
    const details = await contract.getMyCertificates();
    setDetails(details);
  };

  return (
    <div>
      <h2>My Details</h2>
      <button onClick={handleFetchDetails}>Fetch My Details</button>
      <div>
        <p>Name: {details.name}</p>
        <p>Phone Number: {details.phoneNumber}</p>
        <ul>
          {details.certificates.map((cert, index) => <li key={index}>{cert}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default RecipientDetails;
