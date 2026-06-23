def find_self_describing_number():
    for num in range(10**10):
        # Convert number to string
        num_str = str(num)
        
        # Check if the number is self-describing
        for i in range(10):
            # Extract digit i from the number
            digit_count = num_str.count(str(i))
            
            # Check if the count of digit i is equal to the value of digit i
            if int(digit_count) != i:
                break  # Break loop if not self-describing
        else:  # If no break statement executed, number is self-describing
            return num

# Example usage:
number = find_self_describing_number()
print(number)