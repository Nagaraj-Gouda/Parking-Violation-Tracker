"""
validation.py - Automata Theory Integration for Parking Violation Tracker
Implements:
1. Character-by-character Deterministic Finite Automaton (DFA) for vehicle registration number validation.
2. Regular Expression validation using Python's re.fullmatch().
3. Agreement checking between DFA and Regex engines.
4. Violation code syntax and mapping validation.
"""

import re
from typing import Tuple, List, Dict, Any, Optional

# Regular expression pattern specifications
VEHICLE_REGEX_PATTERN = r"[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}"
VIOLATION_CODE_REGEX = r"PV[0-9]{2}"

# Valid violation codes and their official category mappings
VALID_VIOLATION_CATEGORIES = {
    "PV01": "No-Permit",
    "PV02": "Overstay",
    "PV03": "Wrong-Zone",
    "PV04": "Obstruction",
    "PV05": "Disabled-Bay"
}


class VehicleDFA:
    """
    Deterministic Finite Automaton (DFA) for Indian Vehicle Registration Numbers.
    Pattern: [A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}
    
    Formal Definition:
    M = (Q, Sigma, delta, q0, F)
    - Q = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, -1 (DEAD)}
    - Sigma = {A-Z, 0-9}
    - q0 = 0
    - F = {10}
    - delta:
        State 0 -> [A-Z] -> State 1   (State code letter 1)
        State 1 -> [A-Z] -> State 2   (State code letter 2)
        State 2 -> [0-9] -> State 3   (RTO district digit 1)
        State 3 -> [0-9] -> State 4   (RTO district digit 2)
        State 4 -> [A-Z] -> State 5   (Series letter 1)
        State 5 -> [A-Z] -> State 6   (Series letter 2 - optional branch)
        State 5 -> [0-9] -> State 7   (Direct transition if single-letter series)
        State 6 -> [0-9] -> State 7   (Number digit 1)
        State 7 -> [0-9] -> State 8   (Number digit 2)
        State 8 -> [0-9] -> State 9   (Number digit 3)
        State 9 -> [0-9] -> State 10  (Number digit 4)
        State 10 -> any -> DEAD       (Any extra character after digit 4 leads to DEAD)
        Any undefined transition -> DEAD (-1)
    """

    STATE_START = 0
    STATE_ACCEPT = 10
    STATE_DEAD = -1

    STATE_DESCRIPTIONS = {
        0: "Start state: Expecting first state letter [A-Z]",
        1: "State 1: Expecting second state letter [A-Z]",
        2: "State 2: Expecting first RTO digit [0-9]",
        3: "State 3: Expecting second RTO digit [0-9]",
        4: "State 4: Expecting first series letter [A-Z]",
        5: "State 5: Expecting second series letter [A-Z] or first number digit [0-9]",
        6: "State 6: Expecting first number digit [0-9]",
        7: "State 7: Expecting second number digit [0-9]",
        8: "State 8: Expecting third number digit [0-9]",
        9: "State 9: Expecting fourth number digit [0-9]",
        10: "State 10 (Accept): Valid vehicle registration number",
        -1: "State DEAD: Invalid character or transition"
    }

    @staticmethod
    def transition(current_state: int, char: str) -> int:
        """Computes next DFA state based on current state and input character."""
        if current_state == VehicleDFA.STATE_DEAD:
            return VehicleDFA.STATE_DEAD

        is_upper_alpha = 'A' <= char <= 'Z'
        is_digit = '0' <= char <= '9'

        if current_state == 0:
            return 1 if is_upper_alpha else VehicleDFA.STATE_DEAD
        elif current_state == 1:
            return 2 if is_upper_alpha else VehicleDFA.STATE_DEAD
        elif current_state == 2:
            return 3 if is_digit else VehicleDFA.STATE_DEAD
        elif current_state == 3:
            return 4 if is_digit else VehicleDFA.STATE_DEAD
        elif current_state == 4:
            return 5 if is_upper_alpha else VehicleDFA.STATE_DEAD
        elif current_state == 5:
            if is_upper_alpha:
                return 6  # 2nd series letter (e.g., 'AB' in KA01AB1234)
            elif is_digit:
                return 7  # Single series letter, moving to 1st number digit (e.g., 'A' in KA01A1234)
            else:
                return VehicleDFA.STATE_DEAD
        elif current_state == 6:
            return 7 if is_digit else VehicleDFA.STATE_DEAD
        elif current_state == 7:
            return 8 if is_digit else VehicleDFA.STATE_DEAD
        elif current_state == 8:
            return 9 if is_digit else VehicleDFA.STATE_DEAD
        elif current_state == 9:
            return 10 if is_digit else VehicleDFA.STATE_DEAD
        elif current_state == 10:
            # Reached accept state; any additional character traps into DEAD
            return VehicleDFA.STATE_DEAD
        else:
            return VehicleDFA.STATE_DEAD

    @classmethod
    def evaluate(cls, input_str: str) -> Tuple[bool, int, List[Dict[str, Any]], str]:
        """
        Process the string character-by-character through the DFA.
        Returns:
            - is_valid (bool)
            - final_state (int)
            - transitions (list of steps)
            - reason / error message (str)
        """
        if not isinstance(input_str, str):
            return False, cls.STATE_DEAD, [], "Input must be a string."

        if len(input_str) == 0:
            return False, cls.STATE_START, [], "Vehicle number cannot be empty."

        state = cls.STATE_START
        trace: List[Dict[str, Any]] = []

        for idx, char in enumerate(input_str):
            prev_state = state
            state = cls.transition(state, char)
            step_info = {
                "step": idx + 1,
                "character": char,
                "from_state": prev_state,
                "to_state": state,
                "description": cls.STATE_DESCRIPTIONS.get(state, "Unknown state")
            }
            trace.append(step_info)

            if state == cls.STATE_DEAD:
                error_msg = f"DFA error at index {idx} ('{char}'): invalid transition from state {prev_state}."
                return False, state, trace, error_msg

        if state == cls.STATE_ACCEPT:
            return True, state, trace, "DFA accepted: input matches format [A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}"
        else:
            error_msg = f"DFA halted prematurely in non-accepting state {state} ({cls.STATE_DESCRIPTIONS.get(state, '')})."
            return False, state, trace, error_msg


def validate_vehicle_number_dfa(vehicle_number: str) -> Tuple[bool, str, List[Dict[str, Any]]]:
    """Validates vehicle number using the DFA engine."""
    is_valid, final_state, trace, message = VehicleDFA.evaluate(vehicle_number)
    return is_valid, message, trace


def validate_vehicle_number_regex(vehicle_number: str) -> Tuple[bool, str]:
    """
    Validates vehicle number using Python re.fullmatch() with pattern [A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}.
    Does not silently strip or uppercase inputs.
    """
    if not isinstance(vehicle_number, str) or len(vehicle_number) == 0:
        return False, "Vehicle number cannot be empty."

    match = re.fullmatch(VEHICLE_REGEX_PATTERN, vehicle_number)
    if match:
        return True, "Regex matched successfully."
    else:
        return False, "Regex failed: vehicle number does not match pattern [A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}."


def validate_vehicle_number(vehicle_number: str) -> Dict[str, Any]:
    """
    Executes both DFA and Regex validation, checks for strict agreement,
    and returns a complete diagnostic report.
    """
    dfa_valid, dfa_msg, dfa_trace = validate_vehicle_number_dfa(vehicle_number)
    regex_valid, regex_msg = validate_vehicle_number_regex(vehicle_number)

    # Formal comparison between Automata DFA and Regex engines
    agreement = (dfa_valid == regex_valid)

    is_valid = dfa_valid and regex_valid

    error = None
    if not is_valid:
        error = dfa_msg if not dfa_valid else regex_msg
    if not agreement:
        error = "Critical Automata Conflict: DFA and Regex results do not agree!"

    return {
        "valid": is_valid,
        "dfa_result": dfa_valid,
        "dfa_message": dfa_msg,
        "dfa_trace": dfa_trace,
        "regex_result": regex_valid,
        "regex_message": regex_msg,
        "agreement": agreement,
        "error": error
    }


def validate_violation_code_format(code: str) -> Tuple[bool, str]:
    """Validates that the violation code matches the syntax PV[0-9]{2}."""
    if not isinstance(code, str) or len(code) == 0:
        return False, "Violation code cannot be empty."

    if re.fullmatch(VIOLATION_CODE_REGEX, code):
        return True, "Violation code syntax is valid."
    else:
        return False, f"Malformed violation code '{code}': expected 'PV' followed by two digits (e.g., PV01)."


def validate_violation_code(code: str) -> Tuple[bool, str, Optional[str]]:
    """
    Validates violation code format and checks against mapped categories.
    A correctly formatted code that is unmapped (e.g. PV06, PV99) must be rejected
    as an unknown violation code.
    
    Returns:
        (is_valid: bool, message: str, category_name: Optional[str])
    """
    format_valid, format_msg = validate_violation_code_format(code)
    if not format_valid:
        return False, format_msg, None

    if code in VALID_VIOLATION_CATEGORIES:
        category = VALID_VIOLATION_CATEGORIES[code]
        return True, f"Valid code '{code}' mapped to category '{category}'.", category
    else:
        return False, f"Unknown violation code '{code}': syntax is valid but code is not mapped to any known category.", None
