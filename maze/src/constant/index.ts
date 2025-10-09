export const GAME_CONTRACT_ADDRESS="0x55e8c8AbaFB90423231e4B8A4cD4e671013e3490";
export const GAME_ABI=[
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "moves",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "playMove",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]