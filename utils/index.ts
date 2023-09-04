import keccak256 from 'keccak256'
import { MerkleTree } from 'merkletreejs'

export const whitelistHelper = (addresses: string[]) => {
  const leafNodes = addresses.map((addr) => keccak256(addr))
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true })

  const proofs = addresses.map((addr) => ({
    address: addr,
    hexProof: merkleTree.getHexProof(keccak256(addr)),
  }))

  return {
    hexRoot: merkleTree.getHexRoot(),
    proofs,
    addresses,
  }
}
