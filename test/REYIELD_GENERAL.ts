import { REYIELD_NFT, REYIELD_NFT__factory, REYLDToken, ReyieldPermission, ReyieldPermission__factory, REYLDToken__factory } from '../typechain-types'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import _ from 'lodash'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

const baseTokenURI = 'https://reyield.fi/api/nfts/'
describe('REYIELD GENERAL', function () {
  let NFTTokenContract: REYIELD_NFT
  let REYLDTokenContract: REYLDToken
  let ReyieldPermissionContract: ReyieldPermission
  let owner: HardhatEthersSigner
  let otherAccount: HardhatEthersSigner
  let restAccounts: HardhatEthersSigner[]
  beforeEach(async () => {
    const [ownerAccountFromSigners, otherAccountFromSigners, ...restAccountsFromSigners] = await ethers.getSigners()
    owner = ownerAccountFromSigners
    otherAccount = otherAccountFromSigners
    restAccounts = restAccountsFromSigners
    const REYLDFactory = (await ethers.getContractFactory('REYLDToken')) as unknown as REYLDToken__factory
    const NftFactory = (await ethers.getContractFactory('REYIELD_NFT')) as unknown as REYIELD_NFT__factory
    const ReyieldPermissionFactory = (await ethers.getContractFactory('ReyieldPermission')) as unknown as ReyieldPermission__factory
    NFTTokenContract = await NftFactory.deploy(baseTokenURI)
    REYLDTokenContract = await REYLDFactory.deploy(owner.address)
    ReyieldPermissionContract = await ReyieldPermissionFactory.deploy(owner.address, owner.address, REYLDTokenContract, NFTTokenContract, 667, 333)
  })
  describe('NFT Burning', async () => {
    it('burn NFT to get privilege', async () => {
      const mintNum = 60
      const numAddressesToAirdrop = 10
      const addressesToAirdrop = restAccounts.slice(0, numAddressesToAirdrop).map((rest) => rest.address)
      await NFTTokenContract.connect(owner).mintOwner(mintNum)
      await NFTTokenContract.connect(owner).airdrop(addressesToAirdrop)
      await expect(ReyieldPermissionContract.connect(owner).burnERC721(1)).to.be.revertedWith('RPPP')
      // not owner
      await expect(ReyieldPermissionContract.connect(restAccounts[0]).burnERC721(62)).to.be.revertedWith('RPON')
      // no approve to contract
      await expect(ReyieldPermissionContract.connect(restAccounts[0]).burnERC721(61)).to.be.revertedWith(
        'ERC721: caller is not token owner or approved'
      )

      const tokenId61 = 61
      await NFTTokenContract.connect(restAccounts[0]).approve(ReyieldPermissionContract, tokenId61)
      await expect(ReyieldPermissionContract.connect(restAccounts[1]).burnERC721(tokenId61)).to.be.revertedWith('RPON')
      await expect(ReyieldPermissionContract.connect(owner).burnERC721(tokenId61)).to.be.revertedWith('RPON')
      await expect(ReyieldPermissionContract.connect(restAccounts[0]).burnERC721(tokenId61)).to.emit(
        ReyieldPermissionContract,
        'BurnedTimeLimitedPrivilegeNFT'
      )

      const tokenId62 = 62
      await ReyieldPermissionContract.connect(owner).updatePermanentNFTWhitelist([tokenId62])
      await NFTTokenContract.connect(restAccounts[1]).approve(ReyieldPermissionContract, tokenId62)
      expect(await ReyieldPermissionContract.connect(owner).tokenIdToIsPermanent(tokenId62)).to.be.true
      await expect(ReyieldPermissionContract.connect(restAccounts[1]).burnERC721(tokenId62)).to.emit(
        ReyieldPermissionContract,
        'BurnedPermanentPrivilegeNFT'
      )
    })
  })
})
