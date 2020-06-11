function init(){
  document.getElementById('addBtn').addEventListener('click', add);
  document.getElementById('verifyBtn').addEventListener('click', verify);
}

function add(){
  var xhttp = new XMLHttpRequest();
   xhttp.onreadystatechange = function() {
       if (xhttp.readyState == 4){
         if(xhttp.status != 200){
           document.getElementById('status').innerHTML = "Failed to add messsage.";
         } else {
           var resp = JSON.parse(xhttp.responseText);
           document.getElementById('status').innerHTML = "Message added to block " + linkToBlock(resp.blockId);
         }
       }

   }
   xhttp.open("POST", 'add', true);
   xhttp.setRequestHeader('Content-Type', "text/plain");
   xhttp.send(document.getElementById('message').value);
}

function verify(){
  var xhttp = new XMLHttpRequest();
   xhttp.onreadystatechange = function() {
       if (xhttp.readyState == 4){
         if(xhttp.status != 200){
           document.getElementById('status').innerHTML = "Failed to verify messsage.";
         } else {
           var resp = JSON.parse(xhttp.responseText);
           var message = "";
           if(resp.length == 0){
             message = "Your message was not found.";
           } else {
             resp.forEach((e) => {
               if(!e.inBlock){
                 message += "Your message was found, but is not in blockchain yet.";
               } else if(!e.verified){
                 if(!e.invalid){
                   message += "Your message was found in block " + linkToBlock(e.blockId) + ", but couldn't be verified yet.";
                 } else {
                   message += "Your message was found in block " + linkToBlock(e.blockId) + ", but verification detected invalid block.";
                 }
               } else {
                 message += "Your message was found and verified in block " + linkToBlock(e.blockId);
               }
               message += "<br>";
             });
           }


           document.getElementById('status').innerHTML = message;
         }
       }

   }
   xhttp.open("POST", 'verify', true);
   xhttp.setRequestHeader('Content-Type', "text/plain");
   xhttp.send(document.getElementById('message').value);
}

function linkToBlock(id){
  return '<a href="browse?id='+id+'">#'+id+"</a>";
}
