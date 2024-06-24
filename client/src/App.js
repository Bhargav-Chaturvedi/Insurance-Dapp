import React, { useEffect, useState } from "react";
import "./App.css";
import Web3 from "web3";
import {Container,Navbar,Form,Button,Card} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import DecentralizedInsurance from "./contracts/DecentralizedInsurance.json";
// import getWeb3 from './getWeb3';

function App() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [contract, setContract] = useState(null);
  const [policyIdToFetch, setPolicyIdToFetch] = useState("");
  const [fetchedPolicy, setFetchedPolicy] = useState(null);
  const [newPolicy, setNewPolicy] = useState({
    coverage: "",
    premium: "",
    duration: "",
    matureTime: "",
  });
  const [claimStatus, setClaimStatus] = useState(null);
  const [claimIdToFetchStatus, setClaimIdToFetchStatus] = useState("");
  const [claimCount, setClaimCount] = useState(0);
  const [policyCount, setPolicyCount] = useState(0);
  const [policyIdToPurchase, setPolicyIdToPurchase] = useState("");
  const [purchasePremium, setPurchasePremium] = useState("");
  const [claimIdToFetch, setClaimIdToFetch] = useState("");
  const [claimEvidence, setClaimEvidence] = useState("");
  const [claimVerificationId, setClaimVerificationId] = useState("");
  const [claimRejectionId, setClaimRejectionId] = useState("");
  const [claimIdToPayout, setClaimIdToPayout] = useState("");


  useEffect(() => {
    const loadBlockchainData = async () => {
      try {
        // Check if MetaMask or any other Web3 provider is available
        if (window.ethereum) {
          await window.ethereum.enable(); // Request access to user's MetaMask accounts
          const web3 = new Web3(window.ethereum);
          setWeb3(web3);

          const accounts = await web3.eth.getAccounts();
          setAccounts(accounts);

          const networkId = await web3.eth.net.getId();
          const deployedNetwork = DecentralizedInsurance.networks[networkId];

          if (deployedNetwork) {
            const instance = new web3.eth.Contract(
              DecentralizedInsurance.abi,
              deployedNetwork.address
            );
            setContract(instance);

            // Set up event listener for ClaimFiled event
            instance.events.ClaimFiled({ filter: { policyholder: accounts[0] } })
              .on('data', event => {
                console.log("ClaimFiled event:", event);
                // Handle event data as needed
              })
              .on('error', error => {
                console.error("Error in event listener:", error);
                // Handle error in event listener
              });

            // Load policy and claim counts
            const policyCount = await instance.methods.policyCount().call();
            const claimCount = await instance.methods.claimCount().call();
            setPolicyCount(parseInt(policyCount, 10));
            setClaimCount(parseInt(claimCount, 10));
          } else {
            throw new Error("Contract not deployed on this network");
          }
        } else {
          throw new Error("Web3 provider not detected. Please install MetaMask.");
        }
      } catch (error) {
        console.error("Error loading Web3 and contract:", error);
        // Handle error loading Web3 and contract
      }
    };

    loadBlockchainData();
  }, []); // Empty dependency array ensures this runs once on component mount

  const handleAccountChange = (e) => {
    setAccount(e.target.value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPolicy((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const createPolicy = async () => {
    if (!contract) {
      alert("Contract not loaded yet. Please wait.");
      return;
    }

    const { coverage, premium, duration, matureTime } = newPolicy;

    if (!coverage || !premium || !duration || !matureTime) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const coverageInWei = web3.utils.toWei(coverage, "ether");
      const premiumInWei = web3.utils.toWei(premium, "ether");
      const durationInSeconds = parseInt(duration, 10);
      const matureTimeInSeconds = parseInt(matureTime, 10);

      const gasEstimate = await contract.methods
        .createPolicy(
          coverageInWei,
          premiumInWei,
          durationInSeconds,
          matureTimeInSeconds
        )
        .estimateGas({ from: account });

      await contract.methods
        .createPolicy(
          coverageInWei,
          premiumInWei,
          durationInSeconds,
          matureTimeInSeconds
        )
        .send({ from: account, gas: gasEstimate });

      alert("Policy created successfully");
      setPolicyCount(policyCount + 1);
    } catch (error) {
      console.error("Error creating policy:", error);
      alert("Error creating policy");
    }
  };

  const fetchPolicyDetails = async () => {
    if (!contract) {
      alert("Contract not loaded yet. Please wait.");
      return;
    }
    if (!policyIdToFetch) {
      alert("Please enter a policy ID");
      return;
    }

    try {
      const policyDetails = await contract.methods
        .getPolicyDetails(policyIdToFetch)
        .call();
      setFetchedPolicy({
        id: policyDetails[0],
        insurer: policyDetails[1],
        coverage: web3.utils.fromWei(policyDetails[2], "ether"),
        premium: web3.utils.fromWei(policyDetails[3], "ether"),
        duration: policyDetails[4].toString(),
        startDate:
          policyDetails[5] === "0"
            ? "Not Set"
            : new Date(parseInt(policyDetails[5]) * 1000).toLocaleString(),
        matureTime: policyDetails[6].toString(),
        active: policyDetails[7],
      });
    } catch (error) {
      console.error("Error fetching policy details:", error);
      alert("Error fetching policy details");
    }
  };

  const purchasePolicy = async () => {
    if (!contract) {
      alert("Contract not loaded yet. Please wait.");
      return;
    }
    if (!policyIdToPurchase || !purchasePremium) {
      alert("Please enter policy ID and premium amount");
      return;
    }

    const premiumInWei = web3.utils.toWei(purchasePremium, "ether");

    try {
      // const policyDetails = await contract.methods.getPolicyDetails(policyIdToPurchase).call();
      // const requiredPremiumInWei = policyDetails[3];

      const gasEstimate = await contract.methods
        .purchasePolicy(policyIdToPurchase)
        .estimateGas({ from: account, value: premiumInWei });
      await contract.methods
        .purchasePolicy(policyIdToPurchase)
        .send({ from: account, value: premiumInWei, gas: gasEstimate });
      alert("Policy purchased successfully");
    } catch (error) {
      console.error("Error purchasing policy:", error);
      alert("Error purchasing policy");
    }
  };
  const handleClaimSubmission = async () => {
    if (!contract) {
      alert("Contract not loaded yet. Please wait.");
      return;
    }
    if (!policyIdToFetch || !claimEvidence) {
      alert("Please enter a policy ID and claim evidence");
      return;
    }
  
    try {
      const gasEstimate = await contract.methods
        .fileClaim(policyIdToFetch, claimEvidence)
        .estimateGas({ from: account });
  
      // Ensure claimEvidence is correctly formatted
      const formattedEvidence = claimEvidence.startsWith("0x") ? claimEvidence : `0x${claimEvidence}`;
  
      const transaction = await contract.methods
        .fileClaim(policyIdToFetch, formattedEvidence)
        .send({ from: account, gas: gasEstimate });
  
      console.log("Claim filed transaction:", transaction);
  
      alert("Claim filed successfully");
      setClaimCount(prevCount => prevCount + 1); // Increment claim count
    } catch (error) {
      console.error("Error filing claim:", error);
      alert("Error filing claim");
    }
  };
  

  const fetchClaimEvidence = async () => {
    if (!contract) {
      alert("Contract not loaded yet. Please wait.");
      return;
    }
    if (!claimIdToFetch) {
      alert("Please enter a claim ID");
      return;
    }

   
      const evidence = await contract.methods
        .getClaimEvidence(claimIdToFetch)
        .call();
      setClaimEvidence(evidence);
    
  };

  const handleClaimVerification = async () => {
    if (!contract) {
      alert("Contract not loaded yet. Please wait.");
      return;
    }
    if (!claimVerificationId) {
      alert("Please enter a claim ID");
      return;
    }

    try {
      const gasEstimate = await contract.methods
        .verifyClaim(claimVerificationId)
        .estimateGas({ from: account });
      await contract.methods
        .verifyClaim(claimVerificationId)
        .send({ from: account, gas: gasEstimate });
      alert("Claim verified successfully");
    } catch (error) {
      console.error("Error verifying claim:", error);
      alert("Error verifying claim");
    }
  };

  const handleClaimRejection = async () => {
    if (!contract) {
      alert("Contract not loaded yet. Please wait.");
      return;
    }
    if (!claimRejectionId) {
      alert("Please enter a claim ID");
      return;
    }

    try {
      const gasEstimate = await contract.methods
        .rejectClaim(claimRejectionId)
        .estimateGas({ from: account });
      await contract.methods
        .rejectClaim(claimRejectionId)
        .send({ from: account, gas: gasEstimate });
      alert("Claim rejected successfully");
    } catch (error) {
      console.error("Error rejecting claim:", error);
      alert("Error rejecting claim");
    }
  };
  const fetchClaimStatus = async () => {
    if (!contract) {
      alert("Contract not loaded yet. Please wait.");
      return;
    }
    if (!claimIdToFetchStatus) {
      alert("Please enter a claim ID");
      return;
    }

    try {
      const status = await contract.methods
        .getClaimStatus(claimIdToFetchStatus)
        .call();
      setClaimStatus({
        id: status.id,
        policyId: status.policyId,
        policyholder: status.policyholder,
        evidence: status.evidence,
        verified: status.verified,
        paid: status.paid,
        rejected: status.rejected,
      });
    } catch (error) {
      console.error("Error fetching claim status:", error);
      alert("Error fetching claim status");
    }
  };
  const handleClaimPayout = async () => {
    if (!contract) {
      alert("Contract not loaded yet. Please wait.");
      return;
    }
    if (!claimIdToPayout) {
      alert("Please enter a claim ID");
      return;
    }
  
    try {
      const gasEstimate = await contract.methods
        .payoutClaim(claimIdToPayout)
        .estimateGas({ from: account });
      await contract.methods
        .payoutClaim(claimIdToPayout)
        .send({ from: account, gas: gasEstimate });
      alert("Claim payout successful");
    } catch (error) {
      console.error("Error paying out claim:", error);
      alert("Error paying out claim");
    }
  };
  
  return (
    <div className="App">
      <Container>
        <Navbar className="bg-body-tertiary fixed-top">
          <Container>
            <Navbar.Brand href="#home" style={{ fontSize: "24px" }}>
              <h2>
                <b>Decentralized Insurance Platform</b>
              </h2>
            </Navbar.Brand>
            <Navbar.Toggle />
            <Navbar.Collapse className="justify-content-end">
              <Form.Select
                aria-label="Select account"
                onChange={handleAccountChange}
                value={account}
              >
                {accounts.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </Form.Select>
              <Navbar.Text className="ms-3">
                Signed in as: <span>{account ? account : "Not Connected"}</span>
              </Navbar.Text>
            </Navbar.Collapse>
            <Navbar.Text>
              <b>Total Policies: {policyCount}</b>
            </Navbar.Text>
          </Container>
        </Navbar>
      </Container>

      <div style={{ paddingTop: "80px" }}>
        <Container style={{ paddingTop: "80px" }}>
          <Card>
            <Card.Body>
              <Card.Title>Create Policy</Card.Title>
              <Form>
                <Form.Group className="mb-3" controlId="coverage">
                  <Form.Label>Coverage (ETH)</Form.Label>
                  <Form.Control
                    type="text"
                    name="coverage"
                    placeholder="Coverage (ETH)"
                    value={newPolicy.coverage}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="premium">
                  <Form.Label>Premium (ETH)</Form.Label>
                  <Form.Control
                    type="text"
                    name="premium"
                    placeholder="Premium (ETH)"
                    value={newPolicy.premium}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="duration">
                  <Form.Label>Duration (seconds)</Form.Label>
                  <Form.Control
                    type="text"
                    name="duration"
                    placeholder="Duration (seconds)"
                    value={newPolicy.duration}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="matureTime">
                  <Form.Label>Mature Time (seconds)</Form.Label>
                  <Form.Control
                    type="text"
                    name="matureTime"
                    placeholder="Mature Time (seconds)"
                    value={newPolicy.matureTime}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                <Button variant="primary" onClick={createPolicy}>
                  Create Policy
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Container>
      </div>

      <Container style={{ paddingTop: "20px" }}>
        <Card>
          <Card.Body>
            <Card.Title>Fetch Policy Details</Card.Title>
            <Form>
              <Form.Group className="mb-3" controlId="policyIdToFetch">
                <Form.Label>Policy ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Policy ID"
                  value={policyIdToFetch}
                  onChange={(e) => setPolicyIdToFetch(e.target.value)}
                />
              </Form.Group>
              <Button variant="primary" onClick={fetchPolicyDetails}>
                Fetch Policy
              </Button>
            </Form>
            {fetchedPolicy && (
              <div style={{ marginTop: "20px" }}>
                <p>
                  <b>Policy ID:</b> {fetchedPolicy.id}
                </p>
                <p>
                  <b>Insurer:</b> {fetchedPolicy.insurer}
                </p>
                <p>
                  <b>Coverage:</b> {fetchedPolicy.coverage} ETH
                </p>
                <p>
                  <b>Premium:</b> {fetchedPolicy.premium} ETH
                </p>
                <p>
                  <b>Duration:</b> {fetchedPolicy.duration} seconds
                </p>
                <p>
                  <b>Start Date:</b> {fetchedPolicy.startDate}
                </p>
                <p>
                  <b>Mature Time:</b> {fetchedPolicy.matureTime} seconds
                </p>
                <p>
                  <b>Active:</b> {fetchedPolicy.active.toString()}
                </p>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      <Container style={{ paddingTop: "20px" }}>
        <Card>
          <Card.Body>
            <Card.Title>Purchase Policy</Card.Title>
            <Form>
              <Form.Group className="mb-3" controlId="policyIdToPurchase">
                <Form.Label>Policy ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Policy ID"
                  value={policyIdToPurchase}
                  onChange={(e) => setPolicyIdToPurchase(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="purchasePremium">
                <Form.Label>Premium (ETH)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Premium (ETH)"
                  value={purchasePremium}
                  onChange={(e) => setPurchasePremium(e.target.value)}
                />
              </Form.Group>
              <Button variant="primary" onClick={purchasePolicy}>
                Purchase Policy
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>

      <Container style={{ paddingTop: "20px" }}>
        <Card>
          <Card.Body>
            <Card.Title>File Claim</Card.Title>
            <Form>
              <Form.Group className="mb-3" controlId="policyIdToFetch">
                <Form.Label>Policy ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Policy ID"
                  value={policyIdToFetch}
                  onChange={(e) => setPolicyIdToFetch(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="claimEvidence">
                <Form.Label>Claim Evidence</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="IPFS link of Document"
                  value={claimEvidence}
                  onChange={(e) => setClaimEvidence(e.target.value)}
                />
              </Form.Group>
              <Button variant="primary" onClick={handleClaimSubmission}>
                File Claim
              </Button>
            </Form>
            <p>
              <b>Total Claims: {claimCount}</b>
            </p>
          </Card.Body>
        </Card>
      </Container>

      <Container style={{ paddingTop: "20px" }}>
        <Card>
          <Card.Body>
            <Card.Title>Fetch Claim Status</Card.Title>
            <Form>
              <Form.Group className="mb-3" controlId="claimIdToFetchStatus">
                <Form.Label>Claim ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Claim ID"
                  value={claimIdToFetchStatus}
                  onChange={(e) => setClaimIdToFetchStatus(e.target.value)}
                />
              </Form.Group>
              <Button variant="primary" onClick={fetchClaimStatus}>
                Fetch Claim Status
              </Button>
            </Form>
            {claimStatus && (
              <div style={{ marginTop: "10px" }}>
                <h4>Claim Details</h4>
                {/* <p>Claim ID: {claimStatus.id}</p>
                <p>Policy ID: {claimStatus.policyId}</p> */}
                <p>Policyholder: {claimStatus.policyholder}</p>
                <p>Evidence: {claimStatus.evidence}</p>
                <p>Verified: {claimStatus.verified.toString()}</p>
                <p>Paid: {claimStatus.paid.toString()}</p>
                <p>Rejected: {claimStatus.rejected.toString()}</p>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      <Container style={{ paddingTop: "20px" }}>
        <Card>
          <Card.Body>
            <Card.Title>Fetch Claim Evidence</Card.Title>
            <Form>
              <Form.Group className="mb-3" controlId="claimIdToFetch">
                <Form.Label>Claim ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Claim ID"
                  value={claimIdToFetch}
                  onChange={(e) => setClaimIdToFetch(e.target.value)}
                />
              </Form.Group>
              <Button variant="primary" onClick={fetchClaimEvidence}>
                Fetch Claim Evidence
              </Button>
            </Form>
            {claimEvidence && (
              <div style={{ marginTop: "10px" }}>
                <h4>Evidence for Claim ID: {claimIdToFetch}</h4>
                <p>Evidence: {claimEvidence}</p>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      <Container style={{ paddingTop: "20px" }}>
        <Card>
          <Card.Body>
            <Card.Title>Verify Claim</Card.Title>
            <Form>
              <Form.Group className="mb-3" controlId="claimVerificationId">
                <Form.Label>Claim ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Claim ID"
                  value={claimVerificationId}
                  onChange={(e) => setClaimVerificationId(e.target.value)}
                />
              </Form.Group>
              <Button variant="primary" onClick={handleClaimVerification}>
                Verify Claim
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>

      <Container style={{ paddingTop: "20px" }}>
        <Card>
          <Card.Body>
            <Card.Title>Reject Claim</Card.Title>
            <Form>
              <Form.Group className="mb-3" controlId="claimRejectionId">
                <Form.Label>Claim ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Claim ID"
                  value={claimRejectionId}
                  onChange={(e) => setClaimRejectionId(e.target.value)}
                />
              </Form.Group>
              <Button variant="danger" onClick={handleClaimRejection}>
                Reject Claim
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>
      <Container style={{ paddingTop: "20px" }}>
  <Card>
    <Card.Body>
      <Card.Title>Payout Claim</Card.Title>
      <Form>
        <Form.Group className="mb-3" controlId="claimIdToPayout">
          <Form.Label>Claim ID</Form.Label>
          <Form.Control
            type="text"
            placeholder="Claim ID"
            value={claimIdToPayout}
            onChange={(e) => setClaimIdToPayout(e.target.value)}
          />
        </Form.Group>
        <Button variant="success" onClick={handleClaimPayout}>
          Payout Claim
        </Button>
      </Form>
    </Card.Body>
  </Card>
</Container>

    </div>
  );
}

export default App;
