import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import "../src/index.css";
import { IoPersonSharp } from "react-icons/io5";
import { GiVote } from "react-icons/gi";
import { MdTimer } from "react-icons/md";
import { GrStatusGoodSmall } from "react-icons/gr";
import { MdOutlineDone } from "react-icons/md";
import square from "../src/assests/square.png";
import close from "../src/assests/close.png";

const CONTRACT_ADDRESS = "0x554B60Bf9A0B20a7dC8B01A52357B2824d1d5571";
const CONTRACT_ABI = [
  {
    inputs: [
      {
        internalType: "string[]",
        name: "_candidateNames",
        type: "string[]",
      },
      {
        internalType: "uint256",
        name: "_votingDurationInMinutes",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "voter",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "candidateId",
        type: "uint256",
      },
    ],
    name: "VoteCasted",
    type: "event",
  },
  {
    inputs: [],
    name: "admin",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "candidates",
    outputs: [
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "voteCount",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCandidates",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "id",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "name",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "voteCount",
            type: "uint256",
          },
        ],
        internalType: "struct Voting.Candidate[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRemainingTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getVotingStatus",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_candidateId",
        type: "uint256",
      },
    ],
    name: "vote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "voters",
    outputs: [
      {
        internalType: "bool",
        name: "hasVoted",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "votedCandidateId",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "votingDuration",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "votingStart",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const VotingApp = () => {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [remainingTime, setRemainingTime] = useState(0);
  const [votingStatus, setVotingStatus] = useState(false);
  const [winningCandidate, setWinningCandidate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    try {
      if (isConnecting) return; // Prevent multiple connection attempts
      setIsConnecting(true);
      setError("");

      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this application");
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts[0];
      setAccount(account);

      // Initialize provider and contract
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      setProvider(provider);
      setContract(contract);

      // Load initial data
      await loadBlockchainData(contract, account);
    } catch (err) {
      console.error("Connection error:", err);
      setError(err.message || "Failed to connect wallet");
      // Reset states on error
      setAccount("");
      setProvider(null);
      setContract(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount("");
    setProvider(null);
    setContract(null);
    setCandidates([]);
    setHasVoted(false);
    setIsConnecting(false);
  };

  const handleAccountChange = async (accounts) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      if (contract) {
        await loadBlockchainData(contract, accounts[0]);
      }
    } else {
      disconnectWallet();
    }
  };

  useEffect(() => {
    // Check initial connection only once when component mounts
    const checkConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0 && !account) {
          connectWallet();
        }
      }
    };

    checkConnection();

    // Setup event listeners
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountChange);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountChange);
      }
    };
  }, []); // Empty dependency array is fine here as this should only run once on mount

  // Add a separate effect for periodic data updates
  useEffect(() => {
    let interval;

    if (contract && account) {
      // Update blockchain data every 30 seconds
      interval = setInterval(() => {
        loadBlockchainData(contract, account);
      }, 30000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [contract, account]);

  const loadBlockchainData = async (contract, account) => {
    try {
      setLoading(true);
      setError("");

      const candidatesData = await contract.getCandidates();
      setCandidates(candidatesData);

      const winner = determineWinner(candidatesData);
      setWinningCandidate(winner);

      const status = await contract.getVotingStatus();
      setVotingStatus(status);

      if (account) {
        const voterInfo = await contract.voters(account);
        setHasVoted(voterInfo.hasVoted);
      }

      const timeRemaining = await contract.getRemainingTime();
      setRemainingTime(timeRemaining.toNumber());
    } catch (err) {
      console.error("Loading data error:", err);
      setError(
        "Failed to load voting data. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const castVote = async (candidateId) => {
    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const voterInfo = await contract.voters(account);
      if (voterInfo.hasVoted) {
        throw new Error("You have already voted");
      }

      const isVotingOpen = await contract.getVotingStatus();
      if (!isVotingOpen) {
        throw new Error("Voting is currently closed");
      }

      const tx = await contract.vote(candidateId);
      await tx.wait();

      await loadBlockchainData(contract, account);
    } catch (err) {
      console.error("Voting error:", err);
      if (err.message.includes("execution reverted")) {
        setError(
          "Transaction failed. You may have already voted or voting might be closed."
        );
      } else {
        setError(err.message || "Failed to cast vote. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return "Voting Ended";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Function for winning Candidate
  const determineWinner = (candidatesList) => {
    if (!candidatesList || candidatesList.length === 0) return null;

    let winner = candidatesList[0];
    let maxVotes = winner.voteCount.toNumber();
    let isTie = false;

    for (let i = 1; i < candidatesList.length; i++) {
      const currentVotes = candidatesList[i].voteCount.toNumber();
      if (currentVotes > maxVotes) {
        winner = candidatesList[i];
        maxVotes = currentVotes;
        isTie = false;
      } else if (currentVotes === maxVotes) {
        isTie = true;
      }
    }

    return {
      ...winner,
      isTie,
      voteCount: maxVotes,
    };
  };

  return (
    <div className="voting-container">
      <div className="voting-card">
        <div className="voting-header">
          <h1 className="voting-title">Blockchain Voting System</h1>
          <button
            onClick={account ? disconnectWallet : connectWallet}
            disabled={isConnecting}
            className={`connect-button ${account ? "connected" : ""} ${
              isConnecting ? "connecting" : ""
            }`}
          >
            {isConnecting
              ? "Connecting..."
              : account
              ? `${account.slice(0, 6)}...${account.slice(-0)}`
              : "Connect Wallet"}
          </button>
        </div>

        <div className="voting-content">
          {!account ? (
            <div className="welcome-message">
              <h3>Welcome to the Voting System</h3>
              <p>
                Please connect your MetaMask wallet to participate in voting
              </p>
            </div>
          ) : (
            <div className="voting-section">
              <div className="voting-status">
                <div className="status-item">
                  <span>
                    <MdTimer className="timer-icon" /> Remaining Time:{" "}
                    {formatTime(remainingTime)}
                  </span>
                </div>
                <div className="status-item">
                  <span>
                    {" "}
                    <GrStatusGoodSmall className=" status-icon" /> Voting Status
                    : {votingStatus ? "Open" : "Closed "}{" "}
                    {votingStatus ? (
                      <img src={square} alt="square" className="done-icon" />
                    ) : (
                      <img src={close} alt="close" className="done-icon" />
                    )}
                  </span>
                </div>
                {winningCandidate && candidates.length > 0 && (
                  <div className="status-item">
                    <span>
                      <IoPersonSharp className="person-icon" />
                      {winningCandidate.isTie
                        ? "Currently Tied"
                        : `Leading: ${winningCandidate.name} (${winningCandidate.voteCount} votes)`}
                    </span>
                  </div>
                )}
              </div>

              {error && <div className="error-message">{error}</div>}

              {candidates.length > 0 ? (
                <div className="candidates-list">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id.toString()}
                      className="candidate-card"
                    >
                      <div className="candidate-info">
                        <h3>
                          <IoPersonSharp className="person-icon" />
                          {candidate.name}
                        </h3>
                        <p>
                          {" "}
                          <GiVote className="vote-icon" />
                          {candidate.voteCount.toString()} votes
                        </p>
                      </div>
                      <button
                        onClick={() => castVote(candidate.id)}
                        disabled={loading || !votingStatus || hasVoted}
                        className={`vote-button ${hasVoted ? "voted" : ""}`}
                      >
                        <MdOutlineDone className="done-icon" />
                        {hasVoted ? "Voted" : " Vote"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-candidates">
                  <p>No candidates available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VotingApp;
