# Persimmon Intelligence Platform - Setup Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Get Your Claude API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in with your existing Claude account
3. Navigate to "API Keys" section
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

### Step 2: Configure the Data Processor
1. Open your **Persimmon Data Processor.html** file
2. Find this line (around line 600):
   ```javascript
   const API_KEY = 'your-claude-api-key-here';
   ```
3. Replace with your actual API key:
   ```javascript
   const API_KEY = 'sk-ant-api03-your-actual-key-here';
   ```
4. Save the file

### Step 3: Test the Complete Workflow

#### Upload Test Data:
1. Open **Persimmon Data Processor.html** in your browser
2. Click **"Mock Liferaft CSV"** to generate test data
3. Click **"Process Files"** - this will use Claude API
4. Switch to **"Review & Approve"** tab
5. Review AI categorizations and approve relevant items
6. Click **"Publish to Feed"**

#### View in Intelligence Feed:
1. Open **Integrated Persimmon Intelligence Feed.html**
2. You'll see a notification about imported items
3. Click **"Import Items"** to add them to your feed
4. Items will show with "AI Processed" indicators

## 📁 Using Your Real Liferaft CSV Files

### Prepare Your CSV:
1. Export data from Liferaft (any recent CSV export)
2. The parser will automatically detect common columns:
   - `content`, `text`, `message`, `post` → Main content
   - `source`, `platform` → Source platform  
   - `date`, `created`, `timestamp` → Date/time
   - `location`, `country`, `region` → Location
   - `author`, `user`, `username` → Author
   - `url`, `link` → Source link

### Upload and Process:
1. In Data Processor, drag your CSV file to the upload area
2. Click **"Process Files"**
3. Claude API will analyze each row against your PIRs:
   - **Ukraine**: frontline, political, strategic developments
   - **Sabotage**: infrastructure, industrial attacks  
   - **Insider**: employee security, background issues

### Review Results:
- Items marked **"relevant: true"** appear in Review queue
- Items marked **"relevant: false"** are filtered out
- Each item gets confidence score, category, and priority
- You can edit any AI decisions before approving

## 🔧 Troubleshooting

### API Not Working?
1. Check your API key is correct in the code
2. Make sure you have credits in your Anthropic account
3. Open browser developer tools (F12) to see error messages
4. If API fails, system falls back to keyword-based mock analysis

### CSV Not Parsing?
1. Check your CSV has headers in the first row
2. Text fields should be quoted if they contain commas
3. Try the "Mock Liferaft CSV" button first to test
4. Check browser console (F12) for parsing errors

### Items Not Appearing?
1. Make sure you clicked "Publish to Feed" in Data Processor
2. Check for blue notification bar in Intelligence Feed
3. Click "Import Items" button in the notification
4. Imported items appear at top with AI indicators

## 💰 Claude API Costs

**Typical Usage:**
- Processing 100 Liferaft posts: ~$0.50-1.00
- Daily processing: ~$15-30/month
- Much cheaper than Seerist ($1000s/month)

**Cost Control:**
- API only processes when you click "Process Files"
- Failed API calls fall back to free keyword matching
- You can pause processing anytime

## 📊 Weekly Report Integration

### Current Flow:
1. **Raw Data** → Data Processor → **AI Analysis** → Your Review → **Intelligence Feed** → Boss Selection → **Report**

### Export Options:
- **JSON**: For data analysis and archiving
- **Report Generation**: Creates summary for weekly briefings
- **Manual Copy-Paste**: Items formatted for easy copying

## 🎯 Next Steps After Testing

### Week 1: 
- [ ] Test with your real Liferaft CSV files
- [ ] Fine-tune Claude API prompts for better categorization
- [ ] Show demo to your boss

### Week 2:
- [ ] Add GDELT data source (free API)
- [ ] Create automated weekly report template
- [ ] Set up RSS feed monitoring

### Week 3:
- [ ] Build trend analysis dashboard
- [ ] Add email report distribution
- [ ] Integrate with your existing weekly report template

## ❓ Common Questions

**Q: Do I need programming knowledge?**
A: No! Just replace the API key and use the interface. Everything else is point-and-click.

**Q: Can I modify the PIR keywords?**
A: Yes! Edit the prompt in the `processWithClaudeAPI` function to adjust categories and keywords.

**Q: What if Claude categorizes something wrong?**
A: You can edit items in the Review queue before approving. Claude learns your preferences over time.

**Q: How do I backup my data?**
A: Use the "Export Selected" button to save your curated intelligence as JSON files.

---

## 🔥 Ready to Demo?

Once you've completed the setup:

1. **Process some real Liferaft data**
2. **Show the complete workflow to your boss**
3. **Compare costs vs. Seerist/Dragonfly**
4. **Demonstrate the "evidentiary reachback capability"**

This gives you exactly what your boss described: *"a cost-effective evidentiary reachback capability to support the analytic function of corporate security."*