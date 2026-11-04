import { joinAddress } from './address'

describe('joinAddress', () => {
  it('拼接省市区与详细地址', () => {
    expect(joinAddress({ province: '浙江省', city: '杭州市', district: '西湖区', address: '文三路 1 号' })).toBe(
      '浙江省 杭州市 西湖区 文三路 1 号',
    )
  })
  it('直辖市省市同名只显示一次', () => {
    expect(joinAddress({ province: '北京市', city: '北京市', district: '海淀区', address: '' })).toBe('北京市 海淀区')
  })
  it('详细地址已含行政区时不重复', () => {
    expect(
      joinAddress({ province: '浙江省', city: '杭州市', district: '西湖区', address: '浙江省杭州市西湖区文三路' }),
    ).toBe('浙江省杭州市西湖区文三路')
  })
  it('全空返回空串', () => {
    expect(joinAddress({})).toBe('')
  })
})
