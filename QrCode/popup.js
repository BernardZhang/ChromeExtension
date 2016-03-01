var qrcode = new QRCode(document.getElementById("qrcode"), {
    width: 200,
    height: 200
});
var $input = $('#text');

chrome.tabs.getSelected(null, function (tab) {//获取当前tab
    console.log(tab);
    $input.val(tab.url);
    makeCode();
});

function makeCode () {      
    var elText = document.getElementById("text");
    
    if (!elText.value) {
        alert("Input a text");
        elText.focus();
        return;
    }
    
    qrcode.makeCode(elText.value);
}

$input.on("blur", function () {
        makeCode();
    }).
    on("keydown", function (e) {
        if (e.keyCode == 13) {
            makeCode();
        }
    });

