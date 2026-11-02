// Standalone unit test for Invite Pass generation & validation logic
function testInviteCodeGenerator() {
  console.log('🧪 Testing Invite Code Generation Logic...');
  const codes = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    if (code.length !== 6 || isNaN(Number(code))) {
      throw new Error(`Invalid code format: ${code}`);
    }
    codes.add(code);
  }
  // Entropy check: in 1000 random 6-digit numbers, collisions should be very few (< 5%)
  if (codes.size < 950) {
    throw new Error(`High collision rate in code generator: ${1000 - codes.size} duplicates in 1000`);
  }
  console.log(`✅ [Entropy Check Passed] 1,000 passes generated with high entropy (${codes.size} unique values)`);
}

function testDateValidityLogic() {
  console.log('🧪 Testing Date & Time Expiration Calculation...');
  const now = new Date();
  const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const isExpired = (expiry: Date) => expiry.getTime() < Date.now();

  if (isExpired(validUntil)) {
    throw new Error('Fresh pass calculated as expired!');
  }

  const pastDate = new Date(Date.now() - 1000);
  if (!isExpired(pastDate)) {
    throw new Error('Past pass calculated as valid!');
  }
  console.log('✅ [Date Expiration Logic Passed]');
}

function testStatusTransitionRules() {
  console.log('🧪 Testing Pass Lifecycle State Transitions...');
  type Status = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

  const canBeVerified = (status: Status, expiry: Date): { ok: boolean; reason?: string } => {
    if (status === 'USED') return { ok: false, reason: 'PASS_ALREADY_USED' };
    if (status === 'CANCELLED') return { ok: false, reason: 'PASS_CANCELLED' };
    if (status === 'EXPIRED' || expiry.getTime() < Date.now()) return { ok: false, reason: 'PASS_EXPIRED' };
    if (status === 'ACTIVE') return { ok: true };
    return { ok: false, reason: 'INVALID_STATUS' };
  };

  const future = new Date(Date.now() + 3600000);
  const past = new Date(Date.now() - 3600000);

  if (!canBeVerified('ACTIVE', future).ok) throw new Error('Active future pass failed verification');
  if (canBeVerified('USED', future).reason !== 'PASS_ALREADY_USED') throw new Error('Used pass was not blocked');
  if (canBeVerified('CANCELLED', future).reason !== 'PASS_CANCELLED') throw new Error('Cancelled pass was not blocked');
  if (canBeVerified('EXPIRED', future).reason !== 'PASS_EXPIRED') throw new Error('Expired pass was not blocked');
  if (canBeVerified('ACTIVE', past).reason !== 'PASS_EXPIRED') throw new Error('Past active pass was not caught as expired');

  console.log('✅ [Lifecycle State Transitions Passed]');
}

function runAll() {
  console.log('====================================================');
  console.log('⚡ RUNNING PRE-APPROVED VISITOR LOGIC UNIT TESTS');
  console.log('====================================================\n');
  testInviteCodeGenerator();
  testDateValidityLogic();
  testStatusTransitionRules();
  console.log('\n====================================================');
  console.log('🎉 ALL LOGIC UNIT TESTS PASSED SUCCESSFULLY (3/3)');
  console.log('====================================================');
}

runAll();

