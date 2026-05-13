import React, { useState } from 'react';
import { ethers } from 'ethers';
import { getBlockchain } from './ethereum';
import abi from './CertificateManager.json';

function SetDetails() {
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const contractAddress ="0xd9Cd2980969dCA1db4804c4cCC4033c9F7D38680";
    const ContractABI = abi.abi;

    const handleSubmit = async (event) => {
        event.preventDefault();
        const { signer } = await getBlockchain();
        const contract = new ethers.Contract(contractAddress, ContractABI, signer);
        await contract.setRecipientDetails(name, phoneNumber);
    };

    return (
        <div>
            <h2>Set My Details</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" />
                <input type="text" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Your Phone Number" />
                <button type="submit">Update Details</button>
            </form>
        </div>
    );
}

export default SetDetails;
