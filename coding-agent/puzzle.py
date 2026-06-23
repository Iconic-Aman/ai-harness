def find_self_describing_number():
    """
    Function to find and print a 10-digit self-describing number.

    A self-describing number is a number that describes its own digits.
    For example, a self-describing number '10201' describes its digits as:
    - 1 zero
    - 2 ones
    - 0 twos
    - 1 three
    - 1 four
    """
    for num in range(10**(4), 10**(5)):  # Range of possible 10-digit numbers
        str_num = str(num)
        if str_num == ''.join(str(x) for x in [str_num.count('0'), str_num.count('1'), str_num.count('2'), str_num.count('3'), str_num.count('4'), \
                                              str_num.count('5'), str_num.count('6'), str_num.count('7'), str_num.count('8'), str_num.count('9')]):
            print(num)
            break

find_self_describing_number()