import { REYIELD_NFT, REYIELD_NFT__factory } from '../typechain-types'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import _ from 'lodash'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import moment from 'moment'
import { whitelistHelper } from '../utils'

let NFTTokenContract: REYIELD_NFT
let NFTTokenContractFactory: REYIELD_NFT__factory
let owner: HardhatEthersSigner
let otherAccount: HardhatEthersSigner
let restAccounts: HardhatEthersSigner[]
const baseTokenURI = 'https://reyield.fi/api/nfts/'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

describe('REYIELD NFT', function () {
  beforeEach(async () => {
    const [ownerAddress, otherAccountAddress, ...rest] = await ethers.getSigners()
    owner = ownerAddress
    otherAccount = otherAccountAddress
    restAccounts = rest
    NFTTokenContractFactory = (await ethers.getContractFactory('REYIELD_NFT')) as unknown as REYIELD_NFT__factory
    NFTTokenContract = (await NFTTokenContractFactory.deploy(baseTokenURI)) as REYIELD_NFT
  })

  describe('Deployment', function () {
    it('deployer is owner', async () => {
      expect(await NFTTokenContract.owner()).to.equal(owner.address)
    })
    it('Should has the correct name and symbol', async function () {
      const total = await NFTTokenContract.balanceOf(owner.address)
      expect(total).to.equal(0)
      expect(await NFTTokenContract.name()).to.equal('REYIELD Finance')
      expect(await NFTTokenContract.symbol()).to.equal('REYIELD')
    })
    it('Should has the correct baseURI', async function () {
      expect(await NFTTokenContract.baseURI()).to.equal(baseTokenURI)
    })
    it('The cost should be 0', async function () {
      expect(await NFTTokenContract.cost()).to.equal(0)
    })
    it('Max supply should be 1000', async function () {
      expect(await NFTTokenContract.maxSupply()).to.equal(1000)
    })
  })

  describe('Owner Minting', async () => {
    it('contract owner can call mintOwner Func', async () => {
      const tokenCount = '1'
      const tokenUrl = `${baseTokenURI}${tokenCount}.json`

      await expect(NFTTokenContract.connect(owner).mintOwner(1))
        .to.emit(NFTTokenContract, 'Transfer')
        .withArgs(ZERO_ADDRESS, owner.address, tokenCount)
      expect(await NFTTokenContract.balanceOf(owner.address)).to.equal(1)
      expect(await NFTTokenContract.ownerOf(tokenCount)).to.equal(owner.address)
      expect(await NFTTokenContract.tokenURI(tokenCount)).to.equal(tokenUrl)
      expect(await NFTTokenContract.tokenURI(tokenCount)).to.equal('https://reyield.fi/api/nfts/1.json')
      expect(await NFTTokenContract.totalSupply()).to.equal(1)
    })

    it('other accounts cannot mint tokens', async () => {
      await expect(NFTTokenContract.connect(otherAccount).mintOwner('1')).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('contract owner can call mintOwner & Airdrop Func', async () => {
      const mintNum = 60
      const numAddressesToAirdrop = 10
      const addressesToAirdrop = restAccounts.slice(0, numAddressesToAirdrop).map((rest) => rest.address)
      await NFTTokenContract.connect(owner).mintOwner(mintNum)
      expect(await NFTTokenContract.balanceOf(owner.address)).to.equal(mintNum)
      for (let i = 1; i < mintNum + 1; i++) {
        expect(await NFTTokenContract.ownerOf(i)).to.equal(owner.address)
        expect(await NFTTokenContract.tokenURI(i)).to.equal(`${baseTokenURI}${i}.json`)
      }
      await NFTTokenContract.connect(owner).airdrop(addressesToAirdrop)
      expect(await NFTTokenContract.balanceOf(owner.address)).to.equal(mintNum)
      expect(await NFTTokenContract.totalSupply()).to.equal(mintNum + numAddressesToAirdrop)
    })
  })

  describe('Burn', async () => {
    it('will be minted with the correct tokenURI', async () => {
      const tokenIds = ['1', '2', '3', '4', '5']
      const tokenCount = '1'

      for (const tokenId of tokenIds) {
        const tokenUrl = `${baseTokenURI}${tokenId}.json`
        await expect(NFTTokenContract.connect(owner).mintOwner(tokenCount))
          .to.emit(NFTTokenContract, 'Transfer')
          .withArgs(ZERO_ADDRESS, owner.address, tokenId)
        expect(await NFTTokenContract.tokenURI(tokenId)).to.equal(tokenUrl)
        expect(await NFTTokenContract.ownerOf(tokenCount)).to.equal(owner.address)
      }
      expect(await NFTTokenContract.totalSupply()).to.equal(tokenIds.length)
    })

    it('will be minted with the correct tokenURI while burning', async () => {
      const burnTokenIds = ['1', '2', '3', '4', '5']
      const tokenIds = ['6', '7', '8', '9', '10']
      const tokenCount = '1'

      for await (const burnTokenId of burnTokenIds) {
        const tokenUrl = `${baseTokenURI}${burnTokenId}.json`
        await expect(NFTTokenContract.connect(owner).mintOwner(tokenCount))
          .to.emit(NFTTokenContract, 'Transfer')
          .withArgs(ZERO_ADDRESS, owner.address, burnTokenId)
        expect(await NFTTokenContract.tokenURI(burnTokenId)).to.equal(tokenUrl)
        expect(await NFTTokenContract.ownerOf(burnTokenId)).to.equal(owner.address)
      }
      for await (const burnTokenId of burnTokenIds) {
        await expect(NFTTokenContract.connect(owner).burn(burnTokenId))
          .to.emit(NFTTokenContract, 'Transfer')
          .withArgs(owner.address, ZERO_ADDRESS, burnTokenId)
      }
      for await (const tokenId of tokenIds) {
        const tokenUrl = `${baseTokenURI}${tokenId}.json`
        await expect(NFTTokenContract.connect(owner).mintOwner(tokenCount))
          .to.emit(NFTTokenContract, 'Transfer')
          .withArgs(ZERO_ADDRESS, owner.address, tokenId)
        expect(await NFTTokenContract.tokenURI(tokenId)).to.equal(tokenUrl)
        expect(await NFTTokenContract.ownerOf(tokenId)).to.equal(owner.address)
      }

      expect(await NFTTokenContract.totalSupply()).to.equal(tokenIds.length)
      expect(await NFTTokenContract.nowSupply()).to.equal(tokenIds.length + burnTokenIds.length)
    })
  })

  describe('Whitelist Phrase', async () => {
    it('cannot be minted without whitelist for func of mint', async () => {
      await expect(NFTTokenContract.connect(otherAccount).mint()).to.be.revertedWith('Start timestamp not set')
    })
    it('only owner can set start timestamp', async () => {
      const addresses = await Promise.all(_.take(restAccounts, 10).map((addr) => addr.getAddress()))
      const result = whitelistHelper(addresses)
      const nextUnix = moment().add(1, 'minute').unix()
      const nowUnix = moment().unix()
      const targetSinger: HardhatEthersSigner = restAccounts[0]
      const targetAddr = await targetSinger.getAddress()
      const proof = _.find(result.proofs, { address: targetAddr })
      const merkleProof = proof?.hexProof || ['']

      await expect(NFTTokenContract.connect(otherAccount).setStartTimestamp(nowUnix)).to.be.revertedWith('Ownable: caller is not the owner')
      await expect(NFTTokenContract.connect(otherAccount).mintWhitelist(merkleProof)).to.be.revertedWith('Invalid proof.')
      await expect(NFTTokenContract.connect(owner).setStartTimestamp(nextUnix))
      await expect(NFTTokenContract.connect(otherAccount).mint()).to.be.revertedWith('Not open yet')
      await expect(NFTTokenContract.connect(owner).setStartTimestamp(nowUnix))
      await expect(NFTTokenContract.connect(otherAccount).mint()).to.be.revertedWith('the sale is not active')
      await expect(NFTTokenContract.connect(owner).setMerkleRoot(result.hexRoot))
      await expect(NFTTokenContract.connect(targetSinger).mintWhitelist(merkleProof))
        .to.emit(NFTTokenContract, 'Transfer')
        .withArgs(ZERO_ADDRESS, targetSinger.address, '1')
      await expect(NFTTokenContract.connect(targetSinger).mintWhitelist(merkleProof)).to.be.revertedWith('Minted already')
    })
  })

  describe('Airdrop_MintOwner Phrase', async () => {
    it('cannot be minted by other address', async () => {
      const addresses = await Promise.all(_.take(restAccounts, 10).map((addr) => addr.getAddress()))
      await expect(NFTTokenContract.connect(otherAccount).mintOwner(10)).to.be.revertedWith('Ownable: caller is not the owner')
      await expect(NFTTokenContract.connect(otherAccount).airdrop(addresses)).to.be.revertedWith('Ownable: caller is not the owner')
    })
    it('only owner can airdrop mintOwner', async () => {
      const address = new Array()
      const numAddressesToAirdrop = 3
      const mintAmount = 165
      const total = mintAmount + numAddressesToAirdrop
      const addressesToAirdrop = restAccounts.slice(0, numAddressesToAirdrop).map((rest) => rest.address)

      await expect(NFTTokenContract.connect(owner).mintOwner(0)).to.be.revertedWith('need to mint at least 1 NFT')
      await expect(NFTTokenContract.connect(owner).airdrop(address)).to.be.revertedWith('need to mint at least 1 NFT')
      await NFTTokenContract.connect(owner).mintOwner(mintAmount)
      const supply = await NFTTokenContract.totalSupply()
      expect(supply).to.equal(mintAmount)
      expect(addressesToAirdrop.length).to.equal(numAddressesToAirdrop)
      await expect(NFTTokenContract.connect(owner).airdrop(addressesToAirdrop))
        .to.emit(NFTTokenContract, 'Transfer')
        .withArgs(ZERO_ADDRESS, addressesToAirdrop[0], '166')
      const _supply = await NFTTokenContract.totalSupply()
      expect(_supply).to.equal(total)
    })
    describe('SetCost mint', async () => {
      it('only owner can set cost', async () => {
        const newCost = 900
        await expect(NFTTokenContract.connect(otherAccount).setCost(newCost)).to.be.revertedWith('Ownable: caller is not the owner')
        await NFTTokenContract.connect(owner).setCost(newCost)
        expect(await NFTTokenContract.cost()).to.equal(newCost)
      })
      it('owner can mint with cost', async () => {
        const nowUnix = moment().unix()
        const newCost = 9000000000
        const lowCost = 1000000000
        const _state = true
        await expect(NFTTokenContract.connect(owner).mint()).to.be.revertedWith('Start timestamp not set')
        await NFTTokenContract.connect(owner).setStartTimestamp(nowUnix)
        await expect(NFTTokenContract.connect(owner).mint()).to.be.revertedWith('the sale is not active')
        await NFTTokenContract.connect(owner).setSaleState(_state)
        const state = await NFTTokenContract.saleIsActive()
        expect(state).to.equal(_state)
        await NFTTokenContract.connect(owner).setCost(newCost)
        expect(await NFTTokenContract.cost()).to.equal(newCost)
        // Get the initial balances
        const initialBalance = await NFTTokenContract.balanceOf(owner.address)
        // Call the mint function with enough Ether to mint an NFToken
        await expect(NFTTokenContract.connect(owner).mint({ value: lowCost })).to.be.revertedWith('insufficient funds')
        await expect(NFTTokenContract.connect(owner).mint({ value: newCost }))
          .to.emit(NFTTokenContract, 'Transfer')
          .withArgs(ZERO_ADDRESS, owner.address, '1')
        // Verify that the NFT1 was minted to the owner
        const newBalance = await NFTTokenContract.balanceOf(owner.address)
        expect(newBalance.toString()).to.equal((initialBalance + BigInt(1)).toString(), 'Incorrect NFT balance for address')
        // Verify that the contract balance has increased by the cost of the NFT
        const contractBalance = await ethers.provider.getBalance(NFTTokenContract)
        expect(contractBalance.toString()).to.equal(newCost.toString(), 'Incorrect contract balance')
      })
    })
  })
})
