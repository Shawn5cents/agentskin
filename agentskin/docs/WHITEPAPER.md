# AgentSkin: context selection before inference

Agent tools frequently return more structure than a task requires. AgentSkin makes context selection an explicit middleware step: classify the source, preserve selected facts, reduce known noise, and report the transformation.

The governing rule is fidelity first, compression second. A smaller result is not a successful result when required information is lost.
