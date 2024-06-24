// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DecentralizedInsurance {
    address public owner;

    // Policy structure
    struct Policy {
        uint id;
        address insurer;
        uint coverage;
        uint premium;
        uint duration;
        uint startDate;
        uint matureTime; // Time after purchase when the policy matures
        bool active;
    }

    // Claim structure
    struct Claim {
        uint id;
        uint policyId;
        address policyholder;
        string evidence; // IPFS hash or URL pointing to evidence
        bool verified;
        bool paid;
        bool rejected;
    }

    uint public policyCount;
    uint public claimCount;

    mapping(uint => Policy) public policies;
    mapping(uint => Claim) public claims;
    mapping(uint => address[]) public policyHolders; // Policy ID to array of policyholders
    mapping(uint => mapping(address => bool)) public hasClaimed; // Tracks if a policyholder has claimed

    event PolicyCreated(uint policyId, address insurer, uint coverage, uint premium, uint duration, uint matureTime);
    event PolicyPurchased(uint policyId, address policyholder);
    event ClaimFiled(uint claimId, uint policyId, address policyholder, string evidence);
    event ClaimVerified(uint claimId, bool verified);
    event ClaimRejected(uint claimId, bool rejected);
    event ClaimPaid(uint claimId, uint policyId, address policyholder, uint amount);

    // Modifier to restrict functions to contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    // Constructor to set the contract deployer as owner
    constructor() {
        owner = msg.sender;
    }

    // Function to receive Ether
    receive() external payable {}

    // Fallback function
    fallback() external payable {}

    // Create a new policy
    function createPolicy(uint _coverage, uint _premium, uint _duration, uint _matureTime) public onlyOwner {
        policyCount++;
        policies[policyCount] = Policy(policyCount, msg.sender, _coverage, _premium, _duration, 0, _matureTime, true);
        emit PolicyCreated(policyCount, msg.sender, _coverage, _premium, _duration, _matureTime);
    }

    // Purchase a policy
    function purchasePolicy(uint _policyId) public payable {
        Policy storage policy = policies[_policyId];
        policy.startDate = block.timestamp;
        require(policy.active, "Policy is not active");
        require(block.timestamp < policy.startDate + policy.duration, "Policy duration has ended");
        require(msg.value == policy.premium, "Incorrect premium amount");

        policyHolders[_policyId].push(msg.sender);
        emit PolicyPurchased(_policyId, msg.sender);
    }

    // File a claim
    function fileClaim(uint _policyId, string memory _evidence) public {
        Policy storage policy = policies[_policyId];
        require(policy.active, "Policy is not active");
        require(isPolicyHolder(_policyId, msg.sender), "Only policyholders can file a claim");
        require(!hasClaimed[_policyId][msg.sender], "Claim already filed by this policyholder");
        require(block.timestamp >= policy.startDate + policy.matureTime, "Policy is not yet matured");

        claimCount++;
        claims[claimCount] = Claim(claimCount, _policyId, msg.sender, _evidence, false, false, false);
        hasClaimed[_policyId][msg.sender] = true;
        emit ClaimFiled(claimCount, _policyId, msg.sender, _evidence);
    }

    // Verify a claim
    function verifyClaim(uint _claimId) public onlyOwner {
        Claim storage claim = claims[_claimId];
        Policy storage policy = policies[claim.policyId];
        require(block.timestamp >= policy.startDate + policy.matureTime, "Policy is not yet matured");
        require(!claim.verified, "Claim already verified");
        require(!claim.rejected, "Claim has been rejected");

        claim.verified = true;
        emit ClaimVerified(_claimId, true);
    }

    // Reject a claim
    function rejectClaim(uint _claimId) public onlyOwner {
        Claim storage claim = claims[_claimId];
        require(!claim.verified, "Claim already verified");
        require(!claim.rejected, "Claim already rejected");

        claim.rejected = true;
        emit ClaimRejected(_claimId, true);
    }

    // Payout a claim
    function payoutClaim(uint _claimId) public onlyOwner {
        Claim storage claim = claims[_claimId];
        Policy storage policy = policies[claim.policyId];

        require(claim.verified, "Claim not verified");
        require(!claim.paid, "Claim already paid");
        require(address(this).balance >= policy.coverage, "Insufficient contract balance");

        claim.paid = true;

        (bool success, ) = claim.policyholder.call{value: policy.coverage}("");
        require(success, "Transfer failed.");

        emit ClaimPaid(_claimId, claim.policyId, claim.policyholder, policy.coverage);
    }

    // Get policy holders
    function getPolicyHolders(uint _policyId) public view returns (address[] memory) {
        return policyHolders[_policyId];
    }

    // Get policy details
    function getPolicyDetails(uint _policyId) public view returns (
        uint id,
        address insurer,
        uint coverage,
        uint premium,
        uint duration,
        uint startDate,
        uint matureTime,
        bool active
    ) {
        Policy memory policy = policies[_policyId];
        return (
            policy.id,
            policy.insurer,
            policy.coverage,
            policy.premium,
            policy.duration,
            policy.startDate,
            policy.matureTime,
            policy.active
        );
    }

    // Get claim status
    function getClaimStatus(uint _claimId) public view returns (Claim memory) {
        return claims[_claimId];
    }

    // Get claim evidence
    function getClaimEvidence(uint _claimId) public onlyOwner view returns (string memory) {
        Claim storage claim = claims[_claimId];
        return claim.evidence;
    }

    // Check if an address is a policyholder of a specific policy
    function isPolicyHolder(uint _policyId, address _address) internal view returns (bool) {
        address[] storage holders = policyHolders[_policyId];
        for (uint i = 0; i < holders.length; i++) {
            if (holders[i] == _address) {
                return true;
            }
        }
        return false;
    }
}
