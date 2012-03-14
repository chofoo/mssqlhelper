var db = require('./index');

db.config({
	host: '192.168.1.100'
	,port: 1433
	,userName: 'sa'
	,password: '123'
	,database:'testdb'
});

//test query sql

db.query(
	'select @Param1 Param1,@Param2 Param2'
	,{
		 Param1: { type : 'NVarChar', size: 7,value : 'myvalue' }
		 ,Param2: { type : 'Int',value : 321 }
	}
	,function(res){
		if(res.err)throw new Error('database error:'+res.err.msg);
		var rows = res.tables[0].rows;
		for (var i = 0; i < rows.length; i++) {
			console.log(rows[i].getValue(0),rows[i].getValue('Param2'));
		}
	}
);

//test excute sp

db.exec(
	'test_sp'
	,{
		 Param1: {direction:'out', type : 'NVarChar', size: 50,value : 'my Param1 value' }
		 ,Param2: { type : 'Int',value : 123 }
		 ,Param3: {direction:'out', type : 'VarChar', size: 50,value : '789' }
	}
	,function(res){
		if(res.err)throw new Error('database error:'+res.err.msg);

		//get output paramater value
		console.log('output @Param1='+res.params.Param1.value);

		//get rows
		var rows = res.tables[0].rows;
		for (var i = 0; i < rows.length; i++) {
			var rp = '';
			for(var j=0,len = rows[i].metadata.columns.length;j<len;j++){
				var col = rows[i].metadata.columns[j];
				rp += ' ' +(rows[i].getValue(j));
			}
			console.log(rp);
		}
	}
);
