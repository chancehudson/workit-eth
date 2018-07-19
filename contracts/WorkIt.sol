pragma solidity ^0.4.0;

contract ERC20Interface {
    function totalSupply() public constant returns (uint);
    function balanceOf(address tokenOwner) public constant returns (uint balance);
    function allowance(address tokenOwner, address spender) public constant returns (uint remaining);
    function transfer(address to, uint tokens) public returns (bool success);
    function approve(address spender, uint tokens) public returns (bool success);
    function transferFrom(address from, address to, uint tokens) public returns (bool success);

    event Transfer(address indexed from, address indexed to, uint tokens);
    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
}

contract WorkIt is ERC20Interface {

    uint weiPerToken = 1000000000000000; // 1000 WITs per eth
    uint secondsPerDay = 86400;
    uint daysPerWeek = 7;
    mapping(address => uint) registeredDaysPerWeek;
    mapping(address => uint) lastProofSubmissionDay;
    mapping(address => mapping(uint => string)) workoutProof;
    mapping(address => mapping(uint => uint)) daysWorkedOutPerWeek;

    mapping(uint => uint) totalPeopleCompletedPerWeek;
    mapping(uint => uint) totalPeopleCommittedPerWeek;
    mapping(uint => uint) totalTokensCommittedPerWeek;
    mapping(uint => uint) totalTokensCompletedPerWeek;
    mapping(address => mapping(uint => uint)) tokensCommittedPerWeek;
    mapping(address => mapping(uint => uint)) tokensWonPerWeek;

    mapping(address => uint) lastWeekPaidOut;

    uint startDate;
    address owner;

    constructor() public {
        owner = msg.sender;
        startDate = block.timestamp;
    }

    // Commit to exercising this week
    function commitToWeek(uint tokens) public {
        // Need at least 10 tokens to participate
        require(balances[msg.sender] >= tokens && tokens >= 10);
        require(tokensCommittedPerWeek[msg.sender][currentWeek()] == 0);
        require(registeredDaysPerWeek[msg.sender] <= daysPerWeek - currentDayOfWeek());
        balances[0x0] = balances[0x0] + tokens;
        balances[msg.sender] = balances[msg.sender] - tokens;
        emit Transfer(msg.sender, 0x0, tokens);
        tokensCommittedPerWeek[msg.sender][currentWeek()] = tokens;
        totalPeopleCommittedPerWeek[currentWeek()]++;
        totalTokensCommittedPerWeek[currentWeek()] += tokens;
    }

    // Purchase tokens and set workout threshold
    function register(uint _daysPerWeek) public payable {
        require(_daysPerWeek > 0 && _daysPerWeek <= 7);
        require(msg.value > weiPerToken);
        registeredDaysPerWeek[msg.sender] = _daysPerWeek;
        uint tokens = msg.value / weiPerToken;
        balances[msg.sender] = balances[msg.sender] + tokens;
        _totalSupply += tokens;
    }

    function payout() public {
        require(currentWeek() > lastWeekPaidOut[msg.sender]);
        for (uint activeWeek = lastWeekPaidOut[msg.sender]; activeWeek < (currentWeek() - 1); activeWeek++) {
            if (daysWorkedOutPerWeek[msg.sender][activeWeek] < registeredDaysPerWeek[msg.sender]) {
                lastWeekPaidOut[msg.sender] = activeWeek;
                continue;
            }
            uint tokens = totalTokensCommittedPerWeek[activeWeek] - totalTokensCompletedPerWeek[activeWeek] / totalPeopleCompletedPerWeek[activeWeek];
            balances[0x0] = balances[0x0] - tokens;
            balances[msg.sender] = balances[msg.sender] + tokens;
            lastWeekPaidOut[msg.sender] = activeWeek;
        }
    }

    function postProof(string proofUrl) public {
        require(lastProofSubmissionDay[msg.sender] < currentDay());
        workoutProof[msg.sender][currentDay()] = proofUrl;
        daysWorkedOutPerWeek[msg.sender][currentWeek()] += 1;
        lastProofSubmissionDay[msg.sender] = currentDay();
        if (daysWorkedOutPerWeek[msg.sender][currentWeek()] >= registeredDaysPerWeek[msg.sender]) {
            totalPeopleCompletedPerWeek[currentWeek()]++;
            totalTokensCompletedPerWeek[currentWeek()] += tokensCommittedPerWeek[msg.sender][currentWeek()];
        }
    }

    function withdraw(uint tokens) public returns (bool success) {
        require(balances[msg.sender] >= tokens);
        uint weiToSend = tokens * weiPerToken;
        require(address(this).balance >= weiToSend);
        balances[msg.sender] = balances[msg.sender] - tokens;
        _totalSupply -= tokens;
        return msg.sender.send(tokens * weiPerToken);
    }

    function currentDay() public view returns (uint day) {
        return (block.timestamp - startDate) / secondsPerDay;
    }

    function currentWeek() public view returns (uint week) {
        return currentDay() / daysPerWeek;
    }

    function currentDayOfWeek() public view returns (uint dayIndex) {
        // Uses the floor to calculate offset
        return currentDay() - (currentWeek() * daysPerWeek);
    }

    // non-fixed supply ERC20 implementation
    uint _totalSupply = 0;
    mapping(address => uint) balances;
    mapping(address => mapping(address => uint)) allowances;

    function totalSupply() public constant returns (uint) {
        return _totalSupply;
    }

    function balanceOf(address tokenOwner) public constant returns (uint balance) {
        return balances[tokenOwner];
    }

    function allowance(address tokenOwner, address spender) public constant returns (uint remaining) {
        return allowances[tokenOwner][spender];
    }

    function transfer(address to, uint tokens) public returns (bool success) {
        require(balances[msg.sender] >= tokens);
        balances[msg.sender] = balances[msg.sender] - tokens;
        balances[to] = balances[to] + tokens;
        emit Transfer(msg.sender, to, tokens);
        return true;
    }

    function approve(address spender, uint tokens) public returns (bool success) {
        allowances[msg.sender][spender] = tokens;
        emit Approval(msg.sender, spender, tokens);
        return true;
    }

    function transferFrom(address from, address to, uint tokens) public returns (bool success) {
        require(allowances[from][msg.sender] >= tokens);
        require(balances[from] >= tokens);
        allowances[from][msg.sender] = allowances[from][msg.sender] - tokens;
        balances[from] = balances[from] - tokens;
        balances[to] = balances[to] + tokens;
        emit Transfer(from, to, tokens);
        return true;
    }

}
