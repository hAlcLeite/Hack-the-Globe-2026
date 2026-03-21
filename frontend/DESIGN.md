# EXAMPLE, EDIT LATER WHEN FIND PROPER DESIGN
# design 

Rules: do not overpopulate the globals.css file. Do NOT add unnecsseary styling, do NOT worry about light mode for the first iteration. Assume that dark mode is the only mode.

## styling 

Use a monochrome black and white styling with a NeoBrutalistic inspired design. Dark mode colors: Black for the background, white text, sharp corners.

## Microinteractions 

1. hover: when the user hovers over a button, in dark mode, change the background color of the element from black to white and change the text color to black.
2. expand: when the user hovers over an element, expand the size of the element.


## Notes will edit later,

A palantir like satalie image with real world tracking, to analyze and predcit wild fire patterns, seeing where they are most likely to spread and then taking that information to become actionable insights. 

Key features: real time data that is constantly adaptive to real time weather patterns, we want to focus on when fires have already gone out of controlled, so we are looking for ways to contain it easily with minimizing damages. 

The main purpose is to ensure we have stategies for first responders to optimally deploy where the first responders should go to CONTAIN the fires, (for example selective burnign to contain) 

So the model would predcit where the fire would go and cause the most damage, this could be due to many factors that will be adaptive, like wind direction speed satlie imagary for forest paths. 

The way I want to deisng it is similar to the maven smart system dahsboard (https://www.instagram.com/reels/DVy4j07CMln/) WIth the dahsboard being the entirty of Canada first date of being entireity of canada in like blue lines on the province lines with like darker inside, seeing the red dot on BC clicking that and seeing the warning sign in it, when we ZOOM IN to BC we see a bit more of the region so like moutain ranges and shit from google earth we also see a warning popup we have a fire in there that has started x minutes ago, zoom into it we see a very detailed area of the enivorment like we see in the maven smart system of the fire going on in both the satalie and dorone perspective, then doing predictions of where it's going. 

From there in mission control there are multiple tools, we see the amount of ground troops available and sending them to correct locations as well as the taks they should be doing and where. 

For example where our model predicts it will be the worst we send in 50/120 first-responders to start selective burning that area which would result in saving it if the model was correct.
## Competitive Landscape & Product Differentiation

### Canadian Competitors
1. **SenseNet (Vancouver)**: Uses ground sensors, cameras, and satellite data with their "SenseCore" AI to predict fire behavior. Partnered with Rogers.
2. **AltaML (Edmonton)**: Built an AI tool for Alberta Wildfire predicting new fire likelihoods (80% accuracy) to help duty officers deploy resources.
3. **AISIX Solutions (Vancouver)**: Offers "Wildfire 3.0" using BurnP3+ to simulate wildfire behavior for governments and insurers.
4. **FireSafe AI & Firebird**: Startups using sensor fusion (cameras, mobile towers) and ML to predict ignition points and generate risk scores.

### US / California Competitors
1. **Ponderosa AI (Chico, CA)**: Uses AI-powered drones for early detection, mapping hotspots, and even dropping fire retardants.
2. **Seneca**: Uses autonomous drone fleets to detect and suppress fires before they grow.
3. **Lockheed Martin / Project Maven (DoD)**: Project Maven's AI vision tech (Maven Smart System) is actively being adapted for domestic disaster response. The California Air National Guard uses it with MQ-9 Reaper drones (Project Theia) to process video in seconds for wildfire combat.

### CanopyOS Differentiator (The "Palantir/Project Maven" Approach)
While most competitors focus on **early detection** (sensors/drones) or predicting **ignition points**, CanopyOS specifically targets the **tactical containment phase** of an *already out-of-control* fire. Our unique value proposition is the **Reinforcement Learning (RL) Tactical Agent**: treating interagency resource deployment (ground troops, bulldozers) as a high-stakes portfolio optimization problem to calculate precise "choke points" for selective burning and containment breaks. We are building the macro-level "mission control" (similar to Maven) rather than the micro-level detection sensor network.