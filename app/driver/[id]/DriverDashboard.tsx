<div className="bg-gray-50 rounded-lg p-3 text-sm">
  <p className="text-gray-500">Pay via Mobile Money to:</p>
  <p className="font-mono font-semibold text-gray-900 text-base">{momoCode || 'Not set yet'}</p>
  <p className="text-gray-500">{momoName}</p>
  <p className="text-gray-500 mt-2">Dial <span className="font-mono">*165*3#</span> (MTN), choose "Pay Merchant," enter the code above.</p>
</div>
