import axios from 'axios'
import 'dotenv/config'
import { Issuer, errors } from 'openid-client'

const HubAPI = {
  async Init() {
    const baseUrl = process.env.BASE_URL || 'https://hub.staging.nuvias-uc.com/api/v1'
    const clientId = process.env.CLIENT_ID
    const clientSecret = process.env.CLIENT_SECRET

    const issuer = new Issuer({
      token_endpoint: `${baseUrl}/oauth/create_token`,
    })

    const client = new issuer.Client({
      client_id: clientId,
      client_secret: clientSecret,
      token_endpoint_auth_method: 'client_secret_post',
    })

    const tokenSet = await client.grant({
      grant_type: 'client_credentials',
    })

    const axiosInstance = axios.create({
      baseURL: baseUrl,
      headers: { Authorization: `Bearer ${tokenSet.access_token}` },
    })

    this.axios = axiosInstance
  },

  async Whoami() {
    return this.axios.get('/whoami').then(response => response.data)
  },

  async GetCountryByIsoCode(isoCode) {
    const response = await this.axios.get('/country_codes')

    return response.data.find(country => country.iso_code === isoCode)
  },

  async GetShippingTypeByName(name) {
    const response = await this.axios.get('/shipping_types')

    return response.data.find(shipType => shipType.name === name)
  },

  async CreateBasket(payload) {
    const response = await this.axios.post('/baskets', payload)

    return response.data
  },
}

await HubAPI.Init().catch(err => {
  if (err instanceof errors.OPError && err.error === 'invalid_client') {
    console.error('ERROR: Invalid Hub API credentials.')
    process.exit(-1)
  }
})

const whoami = await HubAPI.Whoami()

console.log('Successfully authenticated as', whoami.name)

const gb = await HubAPI.GetCountryByIsoCode('GB')
const shippingType = await HubAPI.GetShippingTypeByName('UK Standard Next Day Delivery')

const basket = await HubAPI.CreateBasket({
  purchase_order_number: 'TESTORDER0001',
  shipping_address: {
    company_name: 'Joe Bloggs Car Parts',
    recipient_name: 'Joe Bloggs',
    addr_line_1: '2 Somewhere Street',
    city: 'Somewheretown',
    postal_code: 'SW1A 1AA',
    country_code: gb.id,
  },
  shipping_type: shippingType.id,
  provisioning_instructions: 'Use ResellerCom profile',
  line_items: [
    {
      product_code: '2200-48820-025',
      quantity: 3,
      prov_product_code: 'UD-SIP-SER-PRV-PH',
    },
  ],
  name: 'API Sample Order',
})

console.log('Successfully created basket', basket.id)
