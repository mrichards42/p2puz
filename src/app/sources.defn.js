/** Source definitions */
export default {
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
}
