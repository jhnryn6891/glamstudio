import json
import os
import streamlit as st
from crewai import Agent, Task, Crew, LLM
from crewai.tools import tool

# 1. Page Title & Styling
st.set_page_config(page_title="Bright Smile Dental AI", page_icon="🦷")
st.title("🦷 Bright Smile Dental Clinic")
st.write("Chat with our AI receptionist to check slots and book your appointment!")

# 2. Local Schedule Setup
SCHEDULE_FILE = "schedule.json"
if not os.path.exists(SCHEDULE_FILE):
    initial_data = {
        "available_slots": ["Tomorrow 10:00 AM", "Tomorrow 2:30 PM", "Friday 11:00 AM"],
        "booked_appointments": []
    }
    with open(SCHEDULE_FILE, "w") as f:
        json.dump(initial_data, f, indent=2)

# 3. Agent Tools (Fixed with a dummy parameter so Groq accepts the schema)
@tool("Check Available Slots")
def check_available_slots(status: str = "all") -> str:
    """Checks the clinic's real schedule file for open appointment slots. Just pass 'all'."""
    with open(SCHEDULE_FILE, "r") as f:
        data = json.load(f)
    return f"Currently open slots: {', '.join(data['available_slots'])}"

@tool("Book Appointment")
def book_appointment(patient_name: str, time_slot: str, reason: str) -> str:
    """Books a dental appointment by removing the slot from available_slots and saving patient info."""
    with open(SCHEDULE_FILE, "r") as f:
        data = json.load(f)
    
    if time_slot not in data["available_slots"]:
        return f"Sorry, {time_slot} is not available."
    
    data["available_slots"].remove(time_slot)
    data["booked_appointments"].append({
        "patient": patient_name,
        "slot": time_slot,
        "reason": reason
    })
    
    with open(SCHEDULE_FILE, "w") as f:
        json.dump(data, f, indent=2)
        
    return f"SUCCESS: Booked {patient_name} for {reason} at {time_slot}."

# 4. Connect LLM
llm = LLM(
    os.getenv("GROQ_API_KEY")
)

receptionist = Agent(
    role="Dental Clinic Receptionist",
    goal="Check real open slots and book patient appointments accurately.",
    backstory="You manage the schedule for Bright Smile Dental. Always check real availability before confirming.",
    tools=[check_available_slots, book_appointment],
    llm=llm
)

# 5. Streamlit Chat UI Layout
if "messages" not in st.session_state:
    st.session_state.messages = []

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

if prompt := st.chat_input("Ask about appointments or book a slot..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            task = Task(
                description=f"Respond to the patient and use your tools if they ask about availability or want to book: '{prompt}'",
                expected_output="A helpful, accurate response based on the real schedule.",
                agent=receptionist
            )
            crew = Crew(agents=[receptionist], tasks=[task])
            reply = str(crew.kickoff())
            st.markdown(reply)
            st.session_state.messages.append({"role": "assistant", "content": reply})