function init(){
  document.getElementById('blockId').addEventListener('change', search);
  document.getElementById('searchBtn').addEventListener('click', search);

  var id = window.location.search.split('=')[1];
  if(id){
    document.getElementById('blockId').value = id;
    search();
  }
}

function search(){
  var blockId = parseInt(document.getElementById('blockId').value);
  if(!isNaN(blockId)){
    var xhttp = new XMLHttpRequest();
     xhttp.onreadystatechange = function() {
         if (xhttp.readyState == 4){
           if(xhttp.status == 200){
             setStatus('');
             var block = JSON.parse(xhttp.responseText);
             show(block);
           } else if (xhttp.status == 404){
             setStatus("Block was not found. If you just added a message to this block, please wait up to 10 seconds until the block is added to chain.");
           } else {
             setStatus("Failed to obtain block info.");
           }
         }
     }
     xhttp.open("GET", '../block/' + blockId, true);
     xhttp.send(null);
  } else {
    setStatus("Please enter a number.");
  }
}

function show(block){
  document.getElementById('block-id').innerHTML = "Block #" + block.blockId;
  document.getElementById('block-hash').value = block.hash;
  document.getElementById('block-cont-hash').value = block.contentHash;

  var date = new Date(block.timestamp * 1000);
  document.getElementById('block-time-local').value = date.toString();
  document.getElementById('block-time-utc').value = date.toUTCString();

  document.getElementById('blocks-before').value = block.blockId;
  document.getElementById('blocks-after').value = block.blocksAfter;
}

function setStatus(status){
  document.getElementById('status').innerHTML = status;
}
