// Original field guides for ecommerce operators. These explain a method; they do
// not claim that every step is automatically enforced by the Foundry pilot.
export const guides = [
  {
    slug: 'ecommerce-campaign-brief', cluster: 'Brief the work',
    title: 'What belongs in an ecommerce campaign brief?',
    description: 'A practical campaign brief structure for one product and one offer: buyer, promise, proof, constraints, output, and approval.',
    lede: 'A useful brief is the smallest set of facts that lets a creator make a decision without inventing the product. For an ecommerce campaign, that means one product, one current offer, one buyer situation, and a clear file to deliver.',
    body: `<h2>Start with the decision, then the background</h2>
<p>Write the decision the operator must make at the end: choose a concept to produce, approve a landing-page direction, or reject an unsupported claim. A vague objective such as “make better ads” gives the team no way to finish. A brief for one test can be short, but it must name the decision owner and the review date.</p>
<p>Next, specify the product by its actual name and variant. Record the current price, pack size, shipping promise, return policy, and exact URL that the ad will use. If a term varies by market or customer, put the condition beside it. Do not let a creator infer the live offer from an old screenshot.</p>
<h2>Six fields that prevent most rework</h2>
<ol><li><strong>Buyer situation:</strong> what the buyer is trying to solve now, and how aware they are of the product.</li><li><strong>Offer:</strong> exactly what is sold, for how much, where, and under which conditions.</li><li><strong>Approved facts:</strong> features, demonstrations, reviews, and claims with their source files.</li><li><strong>Forbidden claims:</strong> promises, comparisons, and visuals that cannot appear.</li><li><strong>Deliverable:</strong> the number of concepts, copy drafts, image briefs, and page sections expected.</li><li><strong>Approval:</strong> who can accept the file and who can authorize production or publishing.</li></ol>
<p>A source field matters even when the fact looks obvious. “Customers love it” could mean a verified review, an internal hunch, or a sample from one customer. Write which. Unknowns belong in the brief as open questions, not as blank spaces for the model to complete.</p>
<h2>A compact brief you can reuse</h2>
<blockquote><p>Product and variant: [exact item]. Current offer: [price, pack, shipping, market, URL]. Buyer moment: [specific situation]. Desired decision: [what we will choose]. Approved evidence: [source file or link per claim]. Exclusions: [claims, visuals, audiences]. Output: [three distinct concepts, copy, page outline]. Reviewer: [name]. Deadline: [date].</p></blockquote>
<p>Before sending the brief to an AI team, read it as a new employee would. Can they tell which offer is current? Can they distinguish an approved fact from a hypothesis? Can they describe the final file without asking what “done” means? If the answer is no, fix the brief before requesting more drafts.</p>`
  },
  {
    slug: 'ai-campaign-pack-checklist', cluster: 'Brief the work',
    title: 'A reviewable AI campaign pack: the complete checklist',
    description: 'Check the brief, three concepts, copy, landing-page outline, evidence, and unresolved decisions before accepting an AI campaign pack.',
    lede: 'A campaign pack is useful when it makes a decision easier. It should let the operator compare ideas, inspect their evidence, and see what must happen before production.',
    body: `<h2>Check the pack in the order you would use it</h2>
<p>Open with an evidence brief, not the ad copy. It should state the product, buyer, offer, market, destination, approved facts, and unknowns. If the offer in the pack differs from the live page, stop there. A polished headline cannot rescue a mismatched price or promise.</p>
<p>Next, inspect the concepts. Each one needs a distinct reason the buyer might care. “Save time,” “quick results,” and “fast routine” may be the same concept. Distinct concepts might address different buyer jobs, decision barriers, or moments of use. Give each concept one sentence explaining why it deserves a test.</p>
<h2>Minimum contents</h2>
<ul><li><strong>One evidence brief:</strong> source-linked facts and clearly marked unknowns.</li><li><strong>Three concepts:</strong> different reasons to buy, not three tone changes.</li><li><strong>Copy for each concept:</strong> a short and a longer primary-text draft, plus headlines that match the idea.</li><li><strong>One page outline:</strong> opening promise, proof sequence, objection handling, and action for the chosen concept.</li><li><strong>Review notes:</strong> unsupported claims, missing creative assets, and decisions still owned by a person.</li></ul>
<p>Count is only a completeness check. A concept can still be weak or repetitive after all fields are filled. A reviewer should compare the concepts side by side and ask whether each would teach the team something different if tested.</p>
<h2>Use a simple acceptance test</h2>
<p>Ask a second person to answer four questions without reading the prompt history: What is the current offer? What is each concept testing? Which claims have evidence? What can be approved today? If they need the chat transcript to answer, the pack is not a handoff yet.</p>
<p>Accept the file only as a planning result. Production, account access, and publishing are separate decisions. This boundary keeps a useful draft from being mistaken for an approved live campaign.</p>`
  },
  {
    slug: 'ad-concept-vs-variation', cluster: 'Make the campaign',
    title: 'Three ad concepts or three copy variations?',
    description: 'A practical test to separate genuinely different paid-social concepts from superficial wording changes.',
    lede: 'Changing the hook, the first sentence, or the background color can make two ads look different while they ask the buyer to believe the same thing. A concept changes the reason to buy.',
    body: `<h2>Name the belief behind each idea</h2>
<p>Write a one-line belief for every proposed ad: “This product fits my routine,” “I can choose the right option,” or “The offer is worth the price.” If two ideas have the same belief and the same proof, they are likely variations of one concept. They may still be worth testing later, but they should not fill two of three concept slots.</p>
<p>A true concept also changes the evidence job. A convenience angle might need a real usage sequence. A value angle might need clear package arithmetic. A confidence angle might need a fit guide or a credible demonstration. If every concept can reuse the same proof with only a new headline, look again.</p>
<h2>Use the swap test</h2>
<ol><li>Remove the brand name and headline from concept A.</li><li>Place concept B’s headline above A’s body and proof.</li><li>Ask whether the ad still makes roughly the same argument.</li></ol>
<p>If it does, the concepts are too close. Repeat with the landing-page opening. A new concept should usually demand a new first answer on the page, even when the product and offer stay the same.</p>
<h2>Plan the learning before the asset</h2>
<p>For each concept, state what you expect to learn from a qualified test. Do not promise an outcome. The test could reveal which buyer concern draws attention, whether the proof is understood, or whether the offer needs a different explanation. Record the audience, destination, and measurement rule before changing visuals.</p>
<p>Once a concept earns further work, make copy and visual variations within it. That sequence keeps the account from filling with many nearly identical ads while the central buyer question remains unanswered.</p>`
  },
  {
    slug: 'ad-landing-page-message-match', cluster: 'Make the campaign',
    title: 'Match the ad promise to the landing page',
    description: 'A message-match review for ecommerce ads and landing pages: promise, product, offer, proof, and first action.',
    lede: 'An ad earns a click with a particular promise. The first screen of the destination should confirm that the visitor is in the right place and give the next useful answer.',
    body: `<h2>Compare what the visitor sees, not what the team intended</h2>
<p>Put the final ad beside a mobile screenshot of the actual destination. Read only the ad’s first visible promise and the page’s first screen. Does the page name the same product, buyer situation, and offer? Does it answer the question raised by the ad before introducing another angle?</p>
<p>Teams often match a keyword but miss the decision. An ad about choosing a shade can land on a generic benefits page; an ad about package value can land on a hero that hides the pack and price. The page may be good in isolation but still make this click work harder.</p>
<h2>Five checks for every ad and page pair</h2>
<ol><li><strong>Product:</strong> the ad and page show the same item and variant.</li><li><strong>Promise:</strong> the page opens with the result or question that earned the click.</li><li><strong>Offer:</strong> price, pack, shipping, and conditions agree.</li><li><strong>Proof:</strong> the destination supports the strongest claim in the ad.</li><li><strong>Action:</strong> the next tap is obvious on a small phone screen.</li></ol>
<p>Check a real mobile width, including the browser used by paid-social traffic. Desktop layouts can hide a long blank lead, awkward line break, or late offer reveal. Capture the first screen at 320, 375, and 390 pixels and inspect the tap path through the next action.</p>
<h2>Record the mismatch as a change request</h2>
<p>Do not write “improve consistency.” Write the exact ad line, the current page line, and the proposed replacement or new section. If changing the page would damage another campaign, use a dedicated destination for this concept. Keep the accepted offer wording locked while testing the message around it.</p>`
  },
  {
    slug: 'claim-evidence-checklist', cluster: 'Review and approve',
    title: 'A claim and evidence checklist for AI marketing copy',
    description: 'Track each meaningful ad claim to approved proof, distinguish product evidence from category evidence, and leave unknowns open.',
    lede: 'AI can phrase a claim cleanly even when the evidence is weak. The review job is to separate a proven product fact from a plausible category statement, an inference, or an unsupported promise.',
    body: `<h2>Make one row for each claim</h2>
<p>Take the final draft and highlight every line a buyer might rely on: performance, time, savings, compatibility, safety, comparisons, guarantees, and customer outcomes. Put each claim in a row with its source, date, scope, and approved wording. A broad sentence often needs several rows because it combines separate assertions.</p>
<p>For example, an ingredient study can support a statement about that ingredient under the study conditions. It does not automatically prove the finished product works the same way for every customer. A customer comment can support that customer’s experience; it does not establish a typical result. Keep those scopes visible.</p>
<h2>Use four evidence states</h2>
<ul><li><strong>Approved product fact:</strong> supported by a current product record or verified operation.</li><li><strong>Limited customer evidence:</strong> a real attributed experience with a narrow, honest scope.</li><li><strong>Category or ingredient context:</strong> useful education, but not direct product proof.</li><li><strong>Unknown:</strong> no reliable source yet; remove the claim or state the uncertainty.</li></ul>
<p>Record who approved the final wording. Do not let an agent promote “unknown” to “approved” because a sentence sounds reasonable. Where proof is partial, narrow the sentence to the evidence you actually hold.</p>
<h2>Review visuals as claims too</h2>
<p>A before-and-after pair, star count, badge, chart, or product shot can make a claim without using words. Check that the image is authentic, the two sides belong together, numbers are current, and the product shown matches the item sold. If an image is illustrative, label it accurately and keep it away from the proof position.</p>
<p>The output of this review is a short decision: keep, narrow, source, or remove. That decision belongs in the campaign file so the next revision does not quietly restore a rejected claim.</p>`
  },
  {
    slug: 'review-ai-generated-ad-copy', cluster: 'Review and approve',
    title: 'How to review AI-generated ad copy before production',
    description: 'A practical review pass for offer accuracy, distinct angles, evidence, voice, mobile reading, and page match.',
    lede: 'A polished draft is not the same as an approved ad. Review AI copy against the brief and the live offer in a fixed order so a good phrase does not distract from a wrong promise.',
    body: `<h2>First pass: business truth</h2>
<p>Verify the product name, variant, pack, price, discount conditions, shipping promise, guarantee, and destination. Use current source records rather than the model’s memory or a previous campaign. If one of these changes, the ad needs a new review even when the rest of the text is untouched.</p>
<p>Mark every meaningful claim and link it to the evidence sheet. Look for invented customer outcomes, vague authority, false urgency, and category facts written as product results. Check the creative brief and image notes as carefully as the words.</p>
<h2>Second pass: idea quality</h2>
<p>Read the first two visible lines at mobile width. Can a busy buyer tell what the ad is about and why to continue? Compare all concepts side by side. If they differ only in phrasing, return to strategy rather than asking for more synonyms.</p>
<p>Then follow the ad to the page. The page must support the same promise and show the next action without forcing the buyer to hunt for it. A strong ad with a mismatched destination is an incomplete campaign.</p>
<h2>Third pass: production readiness</h2>
<ul><li>Read the copy aloud for awkward or translated phrasing.</li><li>Check line breaks and text hierarchy on a 320–390 pixel screen.</li><li>Confirm that no placeholder, internal note, or unsupported number remains.</li><li>Make sure the CTA names the actual next step.</li><li>Record the final approved text exactly; lock it for production.</li></ul>
<p>Write a brief review verdict: accepted, accepted with specific edits, or rejected with the reason. Save that verdict beside the file. The goal is a traceable decision, not a long conversation about whether the draft “feels good.”</p>`
  },
  {
    slug: 'client-campaign-handoff', cluster: 'Review and approve',
    title: 'Make a campaign handoff a client can actually review',
    description: 'Package campaign direction, proof, copy, page changes, open decisions, and version history in one reviewable handoff.',
    lede: 'A client handoff should make the next decision obvious. A folder of draft ads and chat links asks the client to reconstruct the work before they can approve it.',
    body: `<h2>Lead with the decision requested</h2>
<p>Open the handoff with the product and offer, then state what the client is being asked to approve. Is the choice between three creative concepts, the wording of a guarantee, or the launch of one tested page? Name the decision and deadline. Put supporting research after that, where it can answer questions without hiding the request.</p>
<p>Each concept should fit on a comparable page or section: buyer belief, opening promise, proof required, primary copy, headline, visual direction, and destination. Consistent structure helps the client compare substance instead of formatting.</p>
<h2>Separate ready work from open work</h2>
<ul><li><strong>Ready for review:</strong> copy and structure the team has checked against the brief.</li><li><strong>Needs client input:</strong> missing proof, offer choice, brand voice, legal or operational confirmation.</li><li><strong>Production task:</strong> image, video, page, or tracking work after a concept is selected.</li><li><strong>Publishing task:</strong> account changes requiring separate permission and QA.</li></ul>
<p>This separation protects both sides. A client can approve the creative direction without being assumed to have approved a live budget or a claim whose evidence is missing. The team knows exactly what to make next.</p>
<h2>Make revisions visible</h2>
<p>After feedback, update the same handoff with a version number and a short change note. Quote the approved line exactly when a wording decision matters. Do not bury a new price, promise, or image under a generic “revisions made” note.</p>
<p>Before sending, ask someone outside the project to answer: what was proposed, why, what remains unproven, and what approval is requested? If they cannot do that in a few minutes, simplify the handoff. Foundry’s first workflow is built around this reviewable file rather than a status report.</p>`
  },
  {
    slug: 'human-approval-ai-workflows', cluster: 'Run the workflow',
    title: 'Where human approval belongs in an AI marketing workflow',
    description: 'Put human decisions at the boundaries that change money, customer promises, or live accounts, while letting preparation continue.',
    lede: 'Approval is useful when it is attached to a concrete decision. A vague “looks good” in chat can be mistaken for permission to publish, spend, or change a customer-facing promise.',
    body: `<h2>Define the exact boundary</h2>
<p>For a campaign workflow, there are at least three different approvals: accept a planning file, authorize production of assets, and authorize a live account change. They should not share one button or one sentence. The reviewer needs to see the exact file, version, destination, amount or account, and intended action before granting the relevant approval.</p>
<p>Routine preparation can proceed without an approval for every sentence. The team may gather permitted sources, draft concepts, compare claims, and prepare a page outline. Approval should concentrate at the moments where a human judgement changes the outcome or an external system.</p>
<h2>Show enough evidence to decide</h2>
<ul><li>What will change, including the exact text or asset.</li><li>Where it will change, including the page or account.</li><li>Which proof supports the promise and which facts remain open.</li><li>What happens if the decision is declined or delayed.</li></ul>
<p>A reviewer should be able to accept one version without accidentally accepting later edits. If the offer, target, or payload changes, the decision needs a fresh review. Record the outcome beside the campaign file so an agent does not infer approval from an old conversation.</p>
<h2>Use the lightest safe first workflow</h2>
<p>For a pilot, a document-first campaign pack is a sensible boundary. It can be reviewed for quality without granting Shopify or Meta access. The operator can then move the accepted material through their own production and publishing process. That makes the first result useful while the larger account-connection system is still being built and tested.</p>`
  },
  {
    slug: 'ai-agents-for-ecommerce-operators', cluster: 'Run the workflow',
    title: 'What should an AI team do for an ecommerce operator first?',
    description: 'Choose a small, reviewable ecommerce job before asking AI agents to manage stores, ad accounts, or customer messages.',
    lede: 'An ecommerce operator has many possible AI tasks. The best first task is one with a recurring deadline, source material you can supply, and an output you can judge without giving an agent live account permissions.',
    body: `<h2>Pick one repeatable decision</h2>
<p>A campaign review pack is a useful candidate: the operator knows the product and current offer, has customer language or performance notes, and needs to decide which concept deserves production. The team can draft and review in local files. The result is inspectable even if the brand has no direct store integration.</p>
<p>Other jobs may fit later, but they require different data and trust boundaries. A store audit needs current catalog and analytics access. Customer service needs verified identity, policies, and channel permissions. Budget management needs reliable attribution, account scopes, and a rollback path. Treating all of these as one “AI ecommerce agent” makes the first promise too broad to prove.</p>
<h2>A useful two-role pattern</h2>
<p>Give the maker a narrow assignment: build three distinct campaign concepts from approved facts. Give the reviewer a different job: find unsupported claims, repeated angles, offer mismatches, and missing decisions. The operator then accepts or revises the combined file. A reviewer is valuable only when they challenge the output with the brief, not when they repeat the maker’s praise.</p>
<h2>Measure the right first outcome</h2>
<ul><li>Was the final file complete enough to review without the chat history?</li><li>How many factual corrections did the operator need?</li><li>How much operator time did the task consume from brief to accepted file?</li><li>Did the selected concept keep the same promise on its proposed page?</li></ul>
<p>These are pilot questions, not claims that AI improves revenue. The workflow earns a larger scope only after it reliably finishes the smaller one. Foundry’s current commercial pilot starts with that campaign job and leaves live store and ad actions outside it.</p>`
  },
  {
    slug: 'shopify-product-facts-for-campaigns', cluster: 'Brief the work',
    title: 'Collect product facts before writing a Shopify campaign',
    description: 'Build a current, approved product-facts sheet from a Shopify store and owner records before AI drafts an offer or ad.',
    lede: 'A product page is one source, but it may be out of step with the current offer, fulfillment rule, or approved claim language. Give a campaign team a dated product-facts sheet before asking it to write.',
    body: `<h2>Capture the exact selling unit</h2>
<p>Write the product, variant, size, pack quantity, price, currency, market, destination URL, and any discount condition. A campaign about a four-unit pack cannot borrow the image or price of a single unit. If a free gift appears only with one option, tie that condition to the option in the sheet.</p>
<p>Record shipping and guarantee language from the current store and policy, then confirm with the owner when those disagree. Do not ask an AI tool to choose the more attractive promise. The sheet should preserve the approved string and the date it was checked.</p>
<h2>Add what the buyer needs to see</h2>
<ul><li>Current product photographs or video, with permission and exact variant mapping.</li><li>What the product does and how it is used, in words the brand has approved.</li><li>Known fit limits and common buyer questions.</li><li>Real reviews or support language with permission and context.</li><li>Any legal or policy restrictions on claims and comparisons.</li></ul>
<p>Mark a claim’s source. A customer comment, supplier sheet, lab document, and product page are not interchangeable evidence. If the strongest creative idea depends on a fact you cannot verify, keep it as an open research item rather than writing around the gap.</p>
<h2>Refresh the sheet before each launch</h2>
<p>Prices, stock, shipping terms, and page URLs can change. Compare the sheet to the intended landing page and checkout path immediately before production. Save the checked date in the campaign pack. A short current sheet is more useful than a large stale brand document.</p>`
  },
  {
    slug: 'ai-workflow-provider-limit', cluster: 'Run the workflow',
    title: 'Keep a marketing workflow recoverable when an AI plan reaches a limit',
    description: 'Save objective, sources, file versions, open decisions, and the next step so an interrupted AI workflow can resume cleanly.',
    lede: 'Provider limits and interrupted sessions are normal operational events. A recoverable workflow leaves the operator with a clear file and next step rather than forcing them to reconstruct the job from memory.',
    body: `<h2>Checkpoint the job, not just the conversation</h2>
<p>Keep the approved brief in a local file. Save source paths, the current offer, and exact approved wording beside the draft. Write down what has been completed, what the reviewer rejected, and which decisions remain open. A chat summary can help, but it should point to real files and versions.</p>
<p>When a provider pauses, stop adding new work to the same thread. Inspect the latest saved artifact. Determine whether the maker finished a concept, whether the reviewer started, and whether any output is partial. Resuming from a specific unfinished task is safer than repeating the whole brief and hoping the second run remembers the first.</p>
<h2>Minimum continuation record</h2>
<ul><li>Objective and acceptance criteria.</li><li>Working folder and output file names.</li><li>Approved source files and their latest versions.</li><li>Completed sections and known defects.</li><li>Pending human decisions and the next safe action.</li></ul>
<p>A continuation should not silently choose a new provider, create a new offer, or treat an old acceptance as approval for new text. If a compatible provider is available, the operator should see the handoff and decide whether to continue with it.</p>
<h2>Test recovery with a real interruption</h2>
<p>In a pilot, interrupt a sample campaign after the first concept and again during review. Restart the app and verify that the file, objective, sources, and open decisions survive. The practical measure is whether a new worker can identify the next step without inventing progress. Foundry’s provider handoff is a pilot feature to verify this way, not a promise of uninterrupted work.</p>`
  },
  {
    slug: 'ai-search-content-for-saas', cluster: 'Find the answers',
    title: 'How a small SaaS site can be useful in AI search',
    description: 'An SEO and answer-engine content checklist for a software site: clear answers, crawlable pages, original examples, honest product boundaries, and internal links.',
    lede: 'AEO and AI search do not excuse thin pages. A small software site needs crawlable, useful answers to real buyer questions and a product story that stays consistent across its pages.',
    body: `<h2>Start with questions a buyer must answer</h2>
<p>List the questions someone asks before trying the product: what job does it finish, what files does it need, where does the work run, what can it change, and what happens when the result is wrong? Give each substantial question a clear page with a direct answer near the top. Include a concrete workflow or checklist that is useful without buying.</p>
<p>For Foundry, this means guides about campaign briefs, evidence review, landing-page match, and approval boundaries. They sit close to the first pilot workflow. A generic article about every possible AI trend would add little buyer value or product authority.</p>
<h2>Make the answer easy to crawl and verify</h2>
<ul><li>Publish the answer as HTML text with a descriptive title and one clear H1.</li><li>Link from the homepage and a relevant guide hub; connect related guides to each other.</li><li>Use a canonical URL and include only indexable pages in the XML sitemap.</li><li>Show the actual product state, date, sources, and limits where they matter.</li><li>Keep structured data consistent with visible content; do not add review or rating markup without genuine evidence.</li></ul>
<p><a href="https://developers.google.com/search/docs/fundamentals/ai-optimization-guide">Google’s guide for generative AI features</a> says core SEO practices still apply, including publicly accessible, crawlable content. Its <a href="https://developers.google.com/search/docs/fundamentals/creating-helpful-content">people-first content guidance</a> asks for original, substantial value rather than pages made mainly to manipulate rankings. A sitemap helps discovery; it does not promise indexing.</p>
<h2>Measure a narrow result</h2>
<p>After the domain is connected, submit the sitemap in Search Console, inspect representative URLs, and monitor queries and pages. Keep a separate log of qualified planner starts from organic traffic. Review whether search visitors reach the product explanation and complete a brief. Add pages when a recurring buyer question deserves a better answer, not to reach a target page count.</p>`
  },
  {
    slug: 'marketing-source-of-truth', cluster: 'Brief the work',
    title: 'Build a source of truth for AI-assisted marketing',
    description: 'Keep approved offer facts, customer language, visual references, and rejected claims together so each campaign starts from a reliable base.',
    lede: 'A new AI session cannot be expected to know which of five documents carries the current offer. A small source-of-truth folder makes approved facts easy to find and old decisions hard to mistake for current ones.',
    body: `<h2>Separate facts from direction</h2>
<p>Create one current product sheet for objective facts: what is sold, what it costs, how fulfillment works, where it ships, and which guarantee applies. Keep voice and creative direction in another file. A sample headline is direction for a writer; it is not an approved claim to paste into an ad.</p>
<p>Store source links or filenames beside meaningful facts. If a review comes from a customer, preserve the original words, date, permission, and limits. If a product photo is a reference, note the exact variant and whether it can be used publicly.</p>
<h2>Give every important record a status</h2>
<ul><li><strong>Current and approved:</strong> safe to use within the written scope.</li><li><strong>Draft:</strong> useful for exploration, not for customer-facing copy.</li><li><strong>Rejected:</strong> keep the reason so the same error does not return.</li><li><strong>Expired:</strong> a former price, promotion, shipping term, or page link.</li></ul>
<p>When a new decision arrives, update the current sheet and archive the old version. Do not overwrite the evidence trail. Name who approved the change and what campaigns it affects.</p>
<h2>Test it on a cold start</h2>
<p>Ask someone who has never seen the project to find the current offer, two approved claims, two forbidden claims, and the destination URL. If they must search a chat or ask the owner, the source of truth is incomplete. A campaign workflow can then point to this folder rather than repeat the entire business story in every prompt.</p>`
  }
];
