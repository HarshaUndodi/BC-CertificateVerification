// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateManager {

    // ═══════════════════════════════════════════════════════
    //  STRUCTS
    // ═══════════════════════════════════════════════════════

    struct Certificate {
        string id;
        string issuer;
        address recipient;
        string data;            // IPFS CID or on-chain data
        bool isValid;
        bytes32 photoHash;      // Perceptual hash of candidate photo
        bytes adminSignature;   // Admin/institution EIP-191 signature over metadata
        address issuedBy;       // Institution wallet that minted
        bool revoked;
        uint256 revokedAt;
        uint256 issuedAt;
    }

    struct Institution {
        string name;
        bool isActive;
        uint256 registeredAt;
    }

    struct Recipient {
        string name;
        string phoneNumber;
        string[] certificates;  // List of certificate IDs
    }

    // ═══════════════════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════════════════

    mapping(string => Certificate) private certificates;
    mapping(address => Recipient) private recipients;
    mapping(address => Institution) public institutions;

    address public owner;
    address[] public institutionList;   // for enumeration
    string[] public allCertificateIds;  // for enumeration

    // ═══════════════════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════════════════

    event CertificateCreated(
        string id,
        address indexed recipient,
        address indexed issuedBy,
        uint256 timestamp
    );

    event CertificateRevoked(
        string id,
        address indexed revokedBy,
        uint256 timestamp
    );

    event CertificateVerified(
        string id,
        bool isValid,
        bool isRevoked
    );

    event VerificationLogged(
        string id,
        address indexed verifier,
        uint256 timestamp
    );

    event InstitutionRegistered(
        address indexed addr,
        string name,
        uint256 timestamp
    );

    event InstitutionRevoked(
        address indexed addr,
        uint256 timestamp
    );

    // ═══════════════════════════════════════════════════════
    //  CONSTRUCTOR & MODIFIERS
    // ═══════════════════════════════════════════════════════

    constructor() {
        owner = msg.sender;
        // Owner is also a default institution
        institutions[msg.sender] = Institution({
            name: "Platform Admin",
            isActive: true,
            registeredAt: block.timestamp
        });
        institutionList.push(msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    modifier onlyInstitution() {
        require(
            institutions[msg.sender].isActive,
            "Only registered institutions can perform this action"
        );
        _;
    }

    // ═══════════════════════════════════════════════════════
    //  INSTITUTION MANAGEMENT  (Owner only)
    // ═══════════════════════════════════════════════════════

    function registerInstitution(address _addr, string memory _name) public onlyOwner {
        require(!institutions[_addr].isActive, "Institution already registered");
        institutions[_addr] = Institution({
            name: _name,
            isActive: true,
            registeredAt: block.timestamp
        });
        institutionList.push(_addr);
        emit InstitutionRegistered(_addr, _name, block.timestamp);
    }

    function revokeInstitution(address _addr) public onlyOwner {
        require(institutions[_addr].isActive, "Institution is not active");
        require(_addr != owner, "Cannot revoke the owner");
        institutions[_addr].isActive = false;
        emit InstitutionRevoked(_addr, block.timestamp);
    }

    function getInstitutionCount() public view returns (uint256) {
        return institutionList.length;
    }

    function getInstitutionAt(uint256 index) public view returns (address addr, string memory name, bool isActive, uint256 registeredAt) {
        require(index < institutionList.length, "Index out of range");
        addr = institutionList[index];
        Institution memory inst = institutions[addr];
        return (addr, inst.name, inst.isActive, inst.registeredAt);
    }

    function isInstitution(address _addr) public view returns (bool) {
        return institutions[_addr].isActive;
    }

    // ═══════════════════════════════════════════════════════
    //  CERTIFICATE ISSUANCE  (Institutions only)
    // ═══════════════════════════════════════════════════════

    function generateCertificate(
        string memory _id,
        string memory _issuer,
        address _recipient,
        string memory _data
    ) public onlyInstitution {
        require(!certificates[_id].isValid, "Certificate ID already exists");
        Certificate memory newCert = Certificate({
            id: _id,
            issuer: _issuer,
            recipient: _recipient,
            data: _data,
            isValid: true,
            photoHash: bytes32(0),
            adminSignature: "",
            issuedBy: msg.sender,
            revoked: false,
            revokedAt: 0,
            issuedAt: block.timestamp
        });
        certificates[_id] = newCert;
        recipients[_recipient].certificates.push(_id);
        allCertificateIds.push(_id);
        emit CertificateCreated(_id, _recipient, msg.sender, block.timestamp);
    }

    /// @notice Enhanced issuance with photo hash and admin signature for tamper detection
    function generateCertificateSecure(
        string memory _id,
        string memory _issuer,
        address _recipient,
        string memory _data,
        bytes32 _photoHash,
        bytes memory _adminSignature
    ) public onlyInstitution {
        require(!certificates[_id].isValid, "Certificate ID already exists");
        Certificate memory newCert = Certificate({
            id: _id,
            issuer: _issuer,
            recipient: _recipient,
            data: _data,
            isValid: true,
            photoHash: _photoHash,
            adminSignature: _adminSignature,
            issuedBy: msg.sender,
            revoked: false,
            revokedAt: 0,
            issuedAt: block.timestamp
        });
        certificates[_id] = newCert;
        recipients[_recipient].certificates.push(_id);
        allCertificateIds.push(_id);
        emit CertificateCreated(_id, _recipient, msg.sender, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════
    //  CERTIFICATE REVOCATION
    // ═══════════════════════════════════════════════════════

    function revokeCertificate(string memory _id) public {
        Certificate storage cert = certificates[_id];
        require(cert.isValid, "Certificate does not exist");
        require(!cert.revoked, "Certificate is already revoked");
        require(
            msg.sender == owner || msg.sender == cert.issuedBy,
            "Only the owner or issuing institution can revoke"
        );
        cert.revoked = true;
        cert.revokedAt = block.timestamp;
        emit CertificateRevoked(_id, msg.sender, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════
    //  VERIFICATION  (Free — view function)
    // ═══════════════════════════════════════════════════════

    function verifyCertificate(string memory _id) public view returns (
        bool isValid,
        string memory issuer,
        string memory data,
        bool revoked,
        uint256 revokedAt,
        bytes32 photoHash,
        bytes memory adminSignature,
        address issuedBy,
        uint256 issuedAt
    ) {
        Certificate memory cert = certificates[_id];
        if (cert.isValid) {
            return (
                cert.isValid,
                cert.issuer,
                cert.data,
                cert.revoked,
                cert.revokedAt,
                cert.photoHash,
                cert.adminSignature,
                cert.issuedBy,
                cert.issuedAt
            );
        } else {
            return (false, "", "", false, 0, bytes32(0), "", address(0), 0);
        }
    }

    // ═══════════════════════════════════════════════════════
    //  AUDIT TRAIL  (Optional — costs gas)
    // ═══════════════════════════════════════════════════════

    /// @notice Log a verification event on-chain (optional — costs gas)
    function logVerification(string memory _id) public {
        Certificate memory cert = certificates[_id];
        require(cert.isValid, "Certificate does not exist");
        emit VerificationLogged(_id, msg.sender, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════
    //  RECIPIENT FUNCTIONS
    // ═══════════════════════════════════════════════════════

    function getMyCertificates() public view returns (
        string memory name,
        string memory phoneNumber,
        string[] memory certificateIDs
    ) {
        Recipient storage recipient = recipients[msg.sender];
        return (recipient.name, recipient.phoneNumber, recipient.certificates);
    }

    function setRecipientDetails(string memory _name, string memory _phoneNumber) public {
        recipients[msg.sender] = Recipient({
            name: _name,
            phoneNumber: _phoneNumber,
            certificates: new string[](0)
        });
    }

    // ═══════════════════════════════════════════════════════
    //  UTILITY VIEWS
    // ═══════════════════════════════════════════════════════

    function getCertificateCount() public view returns (uint256) {
        return allCertificateIds.length;
    }

    function getOwner() public view returns (address) {
        return owner;
    }
}
