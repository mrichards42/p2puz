/** Source definitions */
import strftime from 'util/strftime'
import fetchProxy from 'util/fetch'

export default {
  beq: {
    type: 'puz',
    url: 'http://www.brendanemmettquigley.com',
    puzPattern: /"(\S+brendanemmettquigley\.com\/files\/\S+\.puz)"/,
    days: [false, true, false, false, true, false, false],
    formatUrl: function(date) {
      // Fetch the blog post for this url
      const url = this.url + '/' + strftime(date, 'YYYY/MM/DD') + '/'
      return fetchProxy(url).then(r => r.text()).then(text => {
        // Search for the first puz link
        const [, url] = text.match(this.puzPattern) || []
        return url
      })
    },
  },
  // Will Johnson's puzzle pointers
  jonesin: {
    url: 'http://herbach.dnsalias.com/Jonesin/jz{{YYMMDD}}.puz',
    type: 'puz',
    days: [false, false, true, false, false, false, false],
    fixDate: date => {
      // Our source publishes two days late (thursday)
      date.setDate(date.getDate() + 2)
      return date
    },
  },
  wsj: {
    url: 'http://herbach.dnsalias.com/wsj/wsj{{YYMMDD}}.puz',
    type: 'puz',
    days: [false, false, false, false, false, false, true],
  },
  wapo: {
    url: 'http://herbach.dnsalias.com/WaPo/wp{{YYMMDD}}.puz',
    type: 'puz',
    days: [true, false, false, false, false, false, false],
  },
  univ: {
    url: 'http://herbach.dnsalias.com/uc/uc{{YYMMDD}}.puz',
    type: 'puz',
    days: [true, true, true, true, true, true, true],
  },
}
