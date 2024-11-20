// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }
    
    struct Voter {
        bool hasVoted;
        uint256 votedCandidateId;
    }
    
    address public admin;
    Candidate[] public candidates;
    uint256 public votingDuration;
    uint256 public votingStart;
    
    mapping(address => Voter) public voters;
    
    event VoteCasted(address voter, uint256 candidateId);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier votingOpen() {
        require(block.timestamp >= votingStart && 
                block.timestamp <= votingStart + votingDuration,
                "Voting is not currently open");
        _;
    }
    
    constructor(string[] memory _candidateNames, uint256 _votingDurationInMinutes) {
        require(_candidateNames.length > 0, "No candidates provided");
        admin = msg.sender;
        votingDuration = _votingDurationInMinutes * 1 minutes;
        votingStart = block.timestamp;
        
        for (uint i = 0; i < _candidateNames.length; i++) {
            candidates.push(Candidate({
                id: i,
                name: _candidateNames[i],
                voteCount: 0
            }));
        }
    }
    
    function vote(uint256 _candidateId) external votingOpen {
        require(!voters[msg.sender].hasVoted, "You have already voted");
        require(_candidateId < candidates.length, "Invalid candidate ID");
        
        candidates[_candidateId].voteCount++;
        voters[msg.sender] = Voter({
            hasVoted: true,
            votedCandidateId: _candidateId
        });
        
        emit VoteCasted(msg.sender, _candidateId);
    }
    
    function getCandidates() external view returns (Candidate[] memory) {
        return candidates;
    }
    
    function getRemainingTime() external view returns (uint256) {
        if (block.timestamp >= votingStart + votingDuration) {
            return 0;
        }
        return (votingStart + votingDuration) - block.timestamp;
    }
    
    function getVotingStatus() external view returns (bool) {
        return (block.timestamp >= votingStart && 
                block.timestamp <= votingStart + votingDuration);
    }
}