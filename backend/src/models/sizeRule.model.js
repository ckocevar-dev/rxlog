const { Schema, model, models } = require('mongoose');
const Band = new Schema({ heightMin:Number, heightMax:Number, heightEquals:[Number], prefix:{ type:String, required:true } }, { _id:false });
const SizeRuleSchema = new Schema({
  widthMin:Number, widthMax:Number, priority:{ type:Number, default:0 },
  bands:{ type:[Band], default:[] },
  wMin:Number, wMax:Number, minB:Number, maxB:Number, maxBInc:Boolean, legacyBands: Schema.Types.Mixed
}, { collection: 'sizerules' });
SizeRuleSchema.index({ widthMax:1, widthMin:1, priority:1 });
module.exports = models.SizeRule || model('SizeRule', SizeRuleSchema);
