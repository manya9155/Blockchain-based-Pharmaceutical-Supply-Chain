// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract PharmaTraceability {

    enum BatchStatus { Active, Recalled, Dispensed }

    struct TransferRecord {
        address from;
        address to;
        uint256 timestamp;
        string location;
        string note;
    }

    struct Batch {
        string drugName;
        string dosageForm;
        string strength;
        string manufacturerName;
        uint256 mfgDate;
        uint256 expDate;
        address currentOwner;
        BatchStatus status;
        bool exists;
    }

    mapping(bytes32 => Batch) public batches;
    mapping(bytes32 => TransferRecord[]) public batchHistory;

    event BatchCreated(bytes32 batchId, string drugName, string manufacturer);
    event BatchTransferred(bytes32 batchId, address from, address to);
    event BatchStatusUpdated(bytes32 batchId, BatchStatus status);

    modifier onlyExisting(bytes32 batchId) {
        require(batches[batchId].exists, "Batch does not exist");
        _;
    }

    modifier onlyOwner(bytes32 batchId) {
        require(batches[batchId].currentOwner == msg.sender, "Not batch owner");
        _;
    }

    function createBatch(
        bytes32 batchId,
        string memory drugName,
        string memory dosageForm,
        string memory strength,
        string memory manufacturerName,
        uint256 mfgDate,
        uint256 expDate,
        string memory firstLocation
    ) public {
        require(!batches[batchId].exists, "Batch already exists");
        require(mfgDate < expDate, "Invalid dates");

        batches[batchId] = Batch({
            drugName: drugName,
            dosageForm: dosageForm,
            strength: strength,
            manufacturerName: manufacturerName,
            mfgDate: mfgDate,
            expDate: expDate,
            currentOwner: msg.sender,
            status: BatchStatus.Active,
            exists: true
        });

        batchHistory[batchId].push(TransferRecord({
            from: address(0),
            to: msg.sender,
            timestamp: block.timestamp,
            location: firstLocation,
            note: "Batch created"
        }));

        emit BatchCreated(batchId, drugName, manufacturerName);
    }

    function transferBatch(
        bytes32 batchId,
        address to,
        string memory location,
        string memory note
    ) public onlyExisting(batchId) onlyOwner(batchId) {

        address from = msg.sender;
        batches[batchId].currentOwner = to;

        batchHistory[batchId].push(TransferRecord({
            from: from,
            to: to,
            timestamp: block.timestamp,
            location: location,
            note: note
        }));

        emit BatchTransferred(batchId, from, to);
    }

    function updateStatus(bytes32 batchId, BatchStatus newStatus)
        public
        onlyExisting(batchId)
        onlyOwner(batchId)
    {
        batches[batchId].status = newStatus;

        emit BatchStatusUpdated(batchId, newStatus);
    }

    function getBatchHistory(bytes32 batchId)
        public
        view
        returns (TransferRecord[] memory)
    {
        return batchHistory[batchId];
    }

    string public name = "PharmaTraceability";  // keeps your /api/name endpoint working
}
